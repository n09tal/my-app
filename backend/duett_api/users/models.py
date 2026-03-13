from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.models import PermissionsMixin
from auditlog.registry import auditlog
from simple_history.models import HistoricalRecords

from duett_api.utils.models import TimestampMixin
from duett_api.services.models import ServiceType, FundingSource, ZipCode, County


class UserManager(BaseUserManager):
    def get_by_natural_key(self, email):
        return self.get(email__iexact=email)

    def create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("The Email must be set")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        extra_fields.setdefault("is_active", True)
        user.save()
        return user

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self.create_user(email, password, **extra_fields)


class Account(TimestampMixin):
    name = models.CharField(max_length=65)
    legal_name = models.CharField(max_length=255, null=True, blank=True)
    history = HistoricalRecords()

    class Types(models.IntegerChoices):
        Provider = 1, "Provider"
        Agency = 2, "Agency"

    type = models.IntegerField(choices=Types.choices, default=Types.Provider)

    def __str__(self):

        return f"{self.name}"


class User(AbstractBaseUser, PermissionsMixin, TimestampMixin):
    email = models.EmailField(unique=True)
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    last_login = models.DateTimeField(null=True, blank=True)

    account = models.ForeignKey(
        Account, on_delete=models.DO_NOTHING, db_constraint=False, null=True, blank=True
    )

    EMAIL_FIELD = "email"  # for dj_rest_auth
    USERNAME_FIELD = "email"
    objects = UserManager()
    history = HistoricalRecords()

    def __str__(self):
        return self.email

    @property
    def managed_user_count(self):
        return self.managed_user.filter(supervisor=self.pk).count()

    @property
    def group(self) -> str:
        group = self.groups.first()
        return group.name if group else ""


class UserProfile(TimestampMixin):
    user = models.OneToOneField(
        User, on_delete=models.DO_NOTHING, db_constraint=False, primary_key=True
    )
    first_name = models.CharField(max_length=30)
    last_name = models.CharField(max_length=30)
    phone = models.CharField(max_length=16, null=True, blank=True)
    address = models.CharField(max_length=200, null=True, blank=True)
    city = models.CharField(max_length=50, null=True, blank=True)
    state = models.CharField(max_length=30, null=True, blank=True)
    zip = models.CharField(max_length=5, null=True, blank=True)
    history = HistoricalRecords()

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    def __str__(self):
        return self.full_name


class ProviderProfile(TimestampMixin):
    account = models.OneToOneField(
        Account, on_delete=models.DO_NOTHING, db_constraint=False, primary_key=True
    )
    phone = models.CharField(max_length=16)
    email = models.EmailField(unique=True)

    # these show the funding sources, locations, and services that the
    # provider is authorized to provide
    funding_sources = models.ManyToManyField(FundingSource, blank=True)
    services = models.ManyToManyField(ServiceType, blank=True)
    zip_codes = models.ManyToManyField(ZipCode, related_name="zip_code", blank=True)
    counties = models.ManyToManyField(
        "services.County", related_name="providers", blank=True
    )
    all_docs_accepted = models.BooleanField(default=False)
    history = HistoricalRecords()

    def __str__(self):
        try:
            return self.account.name
        except:
            return str(self.account_id)


class AgencyManagedUser(TimestampMixin):
    supervisor = models.ForeignKey(
        User,
        on_delete=models.DO_NOTHING,
        db_constraint=False,
        related_name="supervisor",
    )
    managed_user = models.ForeignKey(
        User,
        on_delete=models.DO_NOTHING,
        related_name="managed_user",
        db_constraint=False,
    )

    def __str__(self):
        return self.managed_user.userprofile.full_name


class AgencyProfile(TimestampMixin):
    account = models.OneToOneField(
        Account, on_delete=models.DO_NOTHING, db_constraint=False, primary_key=True
    )
    history = HistoricalRecords()

    def __str__(self):
        try:
            return str(self.account.name)
        except Exception as e:
            return str(self.account_id)


class UserPreferences(TimestampMixin):
    user = models.OneToOneField(User, on_delete=models.DO_NOTHING, db_constraint=False)

    # comma separated list of column ids
    request_table_columns = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        try:
            return self.user.email
        except:
            return str(self.user_id)

    class Meta:
        verbose_name_plural = "User Preferences"


class TwoFactorAuthentication(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    qr_2fa_enabled = models.BooleanField(default=False)
    otp_2fa_enabled = models.BooleanField(default=False)
    otp_code = models.IntegerField(null=True, blank=True)
    disable_2fa = models.BooleanField(default=False)
    otp_expiration = models.DateTimeField(null=True, blank=True)
    qr_base32 = models.CharField(max_length=255, null=True, blank=True)
    qr_auth_url = models.CharField(max_length=255, null=True, blank=True)
    verified = models.BooleanField(default=False)
    last_configured_2fa = models.DateTimeField(null=True, blank=True)
    last_login_2fa = models.DateTimeField(null=True, blank=True)
    last_prompted_provider = models.DateTimeField(null=True, blank=True)
    phone_number = models.CharField(max_length=16, null=True, blank=True)

    def __str__(self):
        return self.user.email


class UploadDocs(TimestampMixin):
    class Status(models.TextChoices):
        PENDING = "Pending", _("Pending")
        APPROVED = "Approved", _("Approved")
        REJECTED = "Rejected", _("Rejected")

    provider_profile = models.ForeignKey(
        ProviderProfile,
        on_delete=models.CASCADE,
        related_name="upload_docs",
        null=True,
        blank=True,
    )
    link = models.CharField(max_length=100)
    file_name = models.CharField(max_length=255)
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
        null=True,
        blank=True,
    )
    rejection_reason = models.TextField(null=True, blank=True)

    class Meta:
        verbose_name = "Upload Doc"
        verbose_name_plural = "Upload Docs"

    def __str__(self):
        return self.file_name or ""


auditlog.register(Account)
auditlog.register(User)
auditlog.register(UserProfile)
auditlog.register(AgencyProfile)
auditlog.register(ProviderProfile)
auditlog.register(AgencyManagedUser)
auditlog.register(UserPreferences)
auditlog.register(TwoFactorAuthentication)
