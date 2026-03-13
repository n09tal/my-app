from django.contrib.auth import get_user_model
from django.contrib.auth.forms import PasswordResetForm
from django.contrib.auth.models import Group
from django.contrib.sites.models import Site
from rest_framework import serializers
from dj_rest_auth.serializers import UserDetailsSerializer
from dj_rest_auth.registration.serializers import RegisterSerializer
from django.utils.translation import gettext as _
from django.conf import settings
from .constant_test import user_email_list
from .models import (
    Account,
    UserProfile,
    AgencyProfile,
    ProviderProfile,
    AgencyManagedUser,
    UserPreferences,
    User,
    TwoFactorAuthentication,
    UploadDocs,
)


class UserRegistrationSerializer(RegisterSerializer):
    """
    For allauth library
    """

    password2 = serializers.CharField(style={"input_type": "password"}, write_only=True)

    class Meta:
        model = get_user_model()
        fields = ["email", "password", "password2"]
        extra_kwargs = {"password": {"write_only": True}}

    def save(self, request, *args, **kwargs):
        password = self.validated_data["password1"]
        password2 = self.validated_data["password2"]

        if password != password2:
            raise serializers.ValidationError({"password": "Passwords must match."})

        user = get_user_model().objects.create_user(
            email=self.validated_data["email"],
            password=password,
            is_staff=self.validated_data.get("is_staff", False),
            is_active=self.validated_data.get("is_active", True),
        )

        user.save()
        return user


class TwoFactorSerializer(serializers.ModelSerializer):
    class Meta:
        model = TwoFactorAuthentication
        fields = (
            "otp_2fa_enabled",
            "qr_2fa_enabled",
            "last_prompted_provider",
            "disable_2fa",
        )


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = (
            "first_name",
            "last_name",
            "phone",
            "address",
            "city",
            "state",
            "zip",
        )


class UserPreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreferences
        fields = ("id", "request_table_columns")


class CustomUserDetailsSerializer(UserDetailsSerializer):
    """
    User model w/o password
    """

    userprofile = UserProfileSerializer()

    class Meta:
        extra_fields = ["userprofile", "group"]
        if hasattr(get_user_model(), "EMAIL_FIELD"):
            extra_fields.append(get_user_model().EMAIL_FIELD)

        model = get_user_model()
        fields = ("id", *extra_fields)
        read_only_fields = ("email",)


class UserSerializer(serializers.ModelSerializer):
    user_profile = UserProfileSerializer(source="userprofile", default=None)
    user_preferences = UserPreferencesSerializer(
        source="userpreferences", read_only=True
    )
    managed_user_count = serializers.ReadOnlyField()
    is_active = serializers.ReadOnlyField()
    group = serializers.CharField()
    twofactor = serializers.SerializerMethodField(method_name="get_two_factor")
    password = serializers.CharField(write_only=True)

    def get_two_factor(self, obj, name=""):
        twofactor_obj, is_created = TwoFactorAuthentication.objects.get_or_create(
            user=obj
        )
        return TwoFactorSerializer(twofactor_obj).data

    class Meta:
        model = get_user_model()
        fields = (
            "id",
            "is_active",
            "email",
            "created_at",
            "updated_at",
            "user_profile",
            "user_preferences",
            "account",
            "managed_user_count",
            "group",
            "twofactor",
            "password",
        )

        read_only_fields = ("account",)

    def create(self, validated_data):
        request = self.context.get("request")
        if not request:
            raise Exception(
                "UserSerializer must the request data to create a new user."
            )

        user_profile_data = validated_data.pop("userprofile")
        role = validated_data.pop("group")

        group = Group.objects.get(name=role)
        if not request.user.is_authenticated:
            user = get_user_model()(**validated_data)
            password = validated_data.pop("password", None)
            user.set_password(password)
            user_email = user.email
            user_email_list.append(user_email)
            user.save()
            user.groups.add(group)
            return user

        user = get_user_model()(account=request.user.account, **validated_data)
        password = get_user_model().objects.make_random_password(length=24)
        user.set_password(password)
        user.save()

        user.groups.add(group)
        obj, created = UserProfile.objects.update_or_create(
            user=user, defaults=user_profile_data
        )
        user.userprofile = obj
        return user

    def update(self, instance, validated_data):
        user_profile_data = validated_data.pop("userprofile", None)
        role = validated_data.pop("group", None)

        instance = super().update(instance, validated_data)

        if role:
            group = Group.objects.get(name=role)
            instance.groups.set([group])

        if user_profile_data:
            obj, created = UserProfile.objects.update_or_create(
                user=instance, defaults=user_profile_data
            )
            instance.userprofile = obj
        return instance


class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = (
            "name",
            "id",
        )


class AgencyProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgencyProfile
        fields = ("account",)


class ProviderProfileSerializer(serializers.ModelSerializer):
    account = AccountSerializer(many=False)

    class Meta:
        model = ProviderProfile
        fields = ("account", "phone")


class AgencyManagedUserSerializer(serializers.ModelSerializer):
    managed_user = UserSerializer(many=False)

    class Meta:
        model = AgencyManagedUser
        fields = ("id", "supervisor", "managed_user")


class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password_reset_form_class = PasswordResetForm

    def validate_email(self, value):
        self.reset_form = self.password_reset_form_class(data=self.initial_data)
        if not self.reset_form.is_valid():
            raise serializers.ValidationError(_("Error"))

        # FILTER YOUR USER MODEL
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError(_("Invalid e-mail address"))
        return value

    def save(self):
        request = self.context.get("request")
        if Site.objects.filter(domain="qa2.app.duett.io"):
            env_label = "QA2:"
        elif Site.objects.filter(domain="qa.app.duett.io"):
            env_label = "QA:"
        elif Site.objects.filter(domain="staging.app.duett.io"):
            env_label = "STG:"
        else:
            env_label = ""

        opts = {
            "use_https": request.is_secure(),
            "from_email": getattr(settings, "DEFAULT_FROM_EMAIL"),
            # USE YOUR HTML FILE
            "html_email_template_name": "password_reset_email.html",
            "subject_template_name": "subject_template_name.txt",
            "request": request,
        }
        extra_email_context = {
            "env_label": f"{env_label}",
        }
        self.reset_form.save(**opts, extra_email_context=extra_email_context)


class UserProfileSearchSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = (
            "name",
            "first_name",
            "last_name",
        )

    def get_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"


class CustomUserDetailsSearchSerializer(UserDetailsSerializer):
    """
    User model w/o password
    """

    userprofile = UserProfileSearchSerializer()

    class Meta:
        extra_fields = ["userprofile"]
        model = get_user_model()
        fields = ("id", *extra_fields)


class CreateProviderProfileSerializer(serializers.ModelSerializer):
    account = AccountSerializer()

    class Meta:
        model = ProviderProfile
        fields = "__all__"

    def create(self, validated_data):
        account_values = validated_data.pop("account")
        account_obj = Account.objects.create(**account_values)
        provider_profile = ProviderProfile.objects.create(
            account=account_obj, **validated_data
        )
        return provider_profile


class UploadDocsPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = UploadDocs
        fields = ["id", "link", "file_name", "status", "rejection_reason"]
        # read_only_fields = ['upload_date', 'accepted']

    def create(self, validated_data):
        provider_profile = self.context.get("provider_profile")
        instance = UploadDocs.objects.create(
            provider_profile=provider_profile, **validated_data
        )
        return instance

    def update(self, instance: UploadDocs, validated_data):
        instance.file_name = validated_data.get("file_name")
        instance.link = validated_data.get("link")
        instance.status = UploadDocs.Status.PENDING
        instance.rejection_reason = ""
        instance.save()
        return instance


class FileUploadSerializer(serializers.Serializer):
    files = serializers.ListField(
        child=serializers.FileField(allow_empty_file=False, use_url=False)
    )


class SingleFileUploadSerializer(serializers.Serializer):
    file = serializers.FileField(allow_empty_file=False, use_url=False)


class CustomProviderProfileSerializer(serializers.ModelSerializer):
    account = serializers.CharField(write_only=True)
    legal_name = serializers.CharField(write_only=True)
    first_name = serializers.CharField(write_only=True)
    last_name = serializers.CharField(write_only=True)
    phone = serializers.CharField(write_only=True)

    class Meta:
        model = UserProfile
        fields = ["account", "legal_name", "first_name", "last_name", "phone"]

    def create(self, validated_data):
        account_name = validated_data.pop("account")
        legal_name = validated_data.pop("legal_name")
        first_name = validated_data.pop("first_name")
        last_name = validated_data.pop("last_name")
        phone_number = validated_data.pop("phone")
        user = self.context["request"].user

        if not user.is_authenticated:
            raise serializers.ValidationError("User must be authenticated.")

        account = Account.objects.create(name=account_name, legal_name=legal_name)
        user.account = account
        user.save()

        UserProfile.objects.update_or_create(
            user=user,
            defaults={
                "first_name": first_name,
                "last_name": last_name,
                "phone": phone_number,
            },
        )

        provider_profile = ProviderProfile.objects.filter(email=user.email).first()

        if provider_profile:
            if provider_profile.email != user.email:
                raise serializers.ValidationError(
                    "A ProviderProfile with this email already exists."
                )
            provider_profile.phone = phone_number
            provider_profile.save()
        else:
            provider_profile = ProviderProfile.objects.create(
                account=account,
                phone=phone_number,
                email=user.email,
            )
        return provider_profile


class CustomProviderProfileUpdateSerializer(serializers.ModelSerializer):
    account = serializers.CharField(required=False)
    legal_name = serializers.CharField(write_only=True)
    first_name = serializers.CharField(required=False)
    last_name = serializers.CharField(required=False)
    phone = serializers.CharField(required=False)

    class Meta:
        model = UserProfile
        fields = ["account", "legal_name", "first_name", "last_name", "phone"]

    def update(self, instance, validated_data):
        user = self.context["request"].user

        if not user.is_authenticated:
            raise serializers.ValidationError("User must be authenticated.")

        account_name = validated_data.get("account", None)
        legal_name = validated_data.get("legal_name", None)

        # Handle Account creation or update
        if account_name:
            if not user.account:
                account = Account.objects.create(
                    name=account_name, legal_name=legal_name
                )
                user.account = account
            else:
                account = user.account
                account.name = account_name
                account.legal_name = legal_name
                account.save()

        # Update or create UserProfile
        user_profile, _ = UserProfile.objects.update_or_create(
            user=user,
            defaults={
                "first_name": validated_data.get("first_name", instance.first_name),
                "last_name": validated_data.get("last_name", instance.last_name),
                "phone": validated_data.get("phone", instance.phone),
            },
        )

        # Get or create the ProviderProfile
        provider_profile = ProviderProfile.objects.filter(account=user.account).first()
        if provider_profile:
            provider_profile.phone = validated_data.get("phone", instance.phone)
            provider_profile.email = user.email
            provider_profile.save()
        else:
            provider_profile = ProviderProfile.objects.create(
                account=user.account,
                phone=validated_data.get("phone", instance.phone),
                email=user.email,
            )

        return instance


class DirectoryUserSerializer(serializers.ModelSerializer):
    user_profile = UserProfileSerializer(source="userprofile", required=False)
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = get_user_model()
        fields = (
            "id",
            "email",
            "password",
            "is_active",
            "created_at",
            "updated_at",
            "user_profile",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def create(self, validated_data):
        user_profile_data = validated_data.pop("userprofile", {})
        password = validated_data.pop("password")
        user_email_list.append(validated_data["email"])

        user = get_user_model().objects.create_user(
            email=validated_data["email"],
            password=password,
        )

        if user_profile_data:
            UserProfile.objects.update_or_create(user=user, defaults=user_profile_data)
            user.refresh_from_db()

        return user

    def update(self, instance, validated_data):
        user_profile_data = validated_data.pop("userprofile", None)

        for attr, value in validated_data.items():
            if attr == "password":
                instance.set_password(value)
            else:
                setattr(instance, attr, value)
        instance.save()

        if user_profile_data:
            UserProfile.objects.update_or_create(
                user=instance, defaults=user_profile_data
            )

        return instance
