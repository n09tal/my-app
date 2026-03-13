from unittest.mock import patch, MagicMock

from django.contrib.admin.sites import AdminSite
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, RequestFactory
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from duett_api.directory.admin import VendorClaimAdmin
from duett_api.directory.models import (
    VendorDirectory,
    VendorReview,
    FavoriteVendor,
    VendorClaim,
    VendorClaimDocument,
)
from duett_api.users.factories import UserFactory, AccountFactory

from duett_api.directory.serializers import (
    VendorDirectoryListSerializer,
    VendorDirectoryDetailSerializer,
    VendorCountyServiceSerializer,
    FavoriteVendorSerializer,
    VendorClaimSubmitSerializer,
    VendorClaimSerializer,
    VendorClaimResponseSerializer,
)
from duett_api.directory.factories import (
    VendorDirectoryFactory,
    VendorCountyServiceFactory,
    CountyFactory,
    ServiceTypeTestFactory,
    VendorReviewFactory,
    VendorClaimFactory,
    VendorClaimDocumentFactory,
)


class VendorReviewAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.account = AccountFactory()
        self.user = UserFactory(account=self.account)
        self.user.userprofile.first_name = "John"
        self.user.userprofile.last_name = "Doe"
        self.user.userprofile.save()
        self.other_user = UserFactory(account=self.account, email="other@example.com")
        self.vendor = VendorDirectoryFactory()
        self.base_url = f"/api/directory/vendors/{self.vendor.id}/reviews/"

    def test_list_reviews_unauthenticated(self):
        VendorReviewFactory(vendor=self.vendor, status=VendorReview.Status.APPROVED)
        VendorReviewFactory(vendor=self.vendor, status=VendorReview.Status.APPROVED)
        response = self.client.get(f"{self.base_url}?limit=10")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_list_reviews_count_excludes_user_pending_review(self):
        approved1 = VendorReviewFactory(
            vendor=self.vendor, status=VendorReview.Status.APPROVED
        )
        approved2 = VendorReviewFactory(
            vendor=self.vendor, status=VendorReview.Status.APPROVED
        )
        pending_review = VendorReviewFactory(
            vendor=self.vendor, user=self.user, status=VendorReview.Status.PENDING
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.base_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        review_ids = [r["id"] for r in response.data["results"]]
        self.assertEqual(len(review_ids), 3)
        self.assertIn(approved1.id, review_ids)
        self.assertIn(approved2.id, review_ids)
        self.assertIn(pending_review.id, review_ids)

        self.assertEqual(response.data["count"], 2)
        if response.data["results"]:
            review = response.data["results"][0]
            self.assertIn("first_name", review)
            self.assertIn("last_name", review)
            self.assertEqual(len(review["first_name"]), 2)
            self.assertEqual(len(review["last_name"]), 2)

    def test_list_reviews_only_for_vendor(self):
        other_vendor = VendorDirectoryFactory()
        VendorReviewFactory(vendor=self.vendor, status=VendorReview.Status.APPROVED)
        VendorReviewFactory(vendor=other_vendor, status=VendorReview.Status.APPROVED)
        response = self.client.get(f"{self.base_url}?limit=10")
        self.assertEqual(response.data["count"], 1)

    def test_list_reviews_pagination(self):
        for _ in range(15):
            VendorReviewFactory(vendor=self.vendor, status=VendorReview.Status.APPROVED)
        response = self.client.get(f"{self.base_url}?limit=10&offset=0")
        self.assertEqual(len(response.data["results"]), 10)
        self.assertEqual(response.data["count"], 15)
        self.assertIsNotNone(response.data["next"])

    def test_retrieve_review_unauthenticated(self):
        review = VendorReviewFactory(
            vendor=self.vendor, status=VendorReview.Status.APPROVED
        )
        response = self.client.get(f"{self.base_url}{review.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], review.id)
        self.assertEqual(response.data["stars"], review.stars)
        self.assertIn("first_name", response.data)
        self.assertIn("last_name", response.data)
        self.assertEqual(len(response.data["first_name"]), 2)
        self.assertEqual(len(response.data["last_name"]), 2)
        self.assertIn("user", response.data)
        self.assertEqual(response.data["user"], review.user.id)

    def test_retrieve_review_not_found(self):
        response = self.client.get(f"{self.base_url}99999/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_review_authenticated(self):
        self.client.force_authenticate(user=self.user)
        review_data = {
            "stars": 5,
            "description": "Excellent service!",
        }
        response = self.client.post(self.base_url, review_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["first_name"], "J.")
        self.assertEqual(response.data["last_name"], "D.")
        self.assertEqual(response.data["stars"], 5)
        self.assertEqual(int(response.data["vendor"]), self.vendor.id)
        self.assertIn("user", response.data)
        self.assertEqual(response.data["user"], self.user.id)

    def test_create_review_unauthenticated(self):
        review_data = {
            "stars": 5,
            "description": "Great!",
        }
        response = self.client.post(self.base_url, review_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_review_duplicate_fails(self):
        self.client.force_authenticate(user=self.user)
        VendorReviewFactory(vendor=self.vendor, user=self.user)
        review_data = {
            "stars": 4,
            "description": "Another review",
        }
        response = self.client.post(self.base_url, review_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already reviewed", str(response.data))

    def test_create_review_invalid_stars_too_high(self):
        self.client.force_authenticate(user=self.user)
        review_data = {
            "stars": 6,
            "description": "Great!",
        }
        response = self.client.post(self.base_url, review_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_review_invalid_stars_too_low(self):
        self.client.force_authenticate(user=self.user)
        review_data = {
            "stars": 0,
            "description": "Bad!",
        }
        response = self.client.post(self.base_url, review_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_review_missing_required_field(self):
        self.client.force_authenticate(user=self.user)
        review_data = {}
        response = self.client.post(self.base_url, review_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_review_description_too_long(self):
        self.client.force_authenticate(user=self.user)
        long_description = "a" * 501
        review_data = {
            "stars": 5,
            "description": long_description,
        }
        response = self.client.post(self.base_url, review_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("too many characters", str(response.data).lower())

    def test_create_review_description_exactly_500_characters(self):
        self.client.force_authenticate(user=self.user)
        description_500 = "a" * 500
        review_data = {
            "stars": 5,
            "description": description_500,
        }
        response = self.client.post(self.base_url, review_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data["description"]), 500)

    def test_update_review_description_too_long(self):
        review = VendorReviewFactory(vendor=self.vendor, user=self.user, stars=3)
        self.client.force_authenticate(user=self.user)
        long_description = "b" * 501
        update_data = {
            "stars": 4,
            "description": long_description,
        }
        response = self.client.patch(
            f"{self.base_url}{review.id}/", update_data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("too many characters", str(response.data).lower())

    def test_update_own_review(self):
        review = VendorReviewFactory(vendor=self.vendor, user=self.user, stars=3)
        self.client.force_authenticate(user=self.user)
        update_data = {
            "stars": 5,
            "description": "Updated review!",
        }
        response = self.client.put(
            f"{self.base_url}{review.id}/", update_data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["stars"], 5)
        self.assertEqual(response.data["description"], "Updated review!")
        self.assertEqual(response.data["first_name"], "J.")
        self.assertEqual(response.data["last_name"], "D.")
        self.assertEqual(response.data["status"], "pending")

    def test_update_review_resets_status_to_pending(self):
        review = VendorReviewFactory(
            vendor=self.vendor,
            user=self.user,
            status=VendorReview.Status.APPROVED,
            stars=5,
        )
        self.client.force_authenticate(user=self.user)

        update_data = {
            "stars": 4,
            "description": "Changed my mind, it's only 4 stars",
        }
        response = self.client.patch(
            f"{self.base_url}{review.id}/", update_data, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "pending")

        review.refresh_from_db()
        self.assertEqual(review.status, VendorReview.Status.PENDING)

    def test_partial_update_own_review(self):
        review = VendorReviewFactory(vendor=self.vendor, user=self.user, stars=3)
        self.client.force_authenticate(user=self.user)
        update_data = {"stars": 4}
        response = self.client.patch(
            f"{self.base_url}{review.id}/", update_data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["stars"], 4)

    def test_update_other_users_review_forbidden(self):
        review = VendorReviewFactory(
            vendor=self.vendor,
            user=self.other_user,
            status=VendorReview.Status.APPROVED,
        )
        self.client.force_authenticate(user=self.user)
        update_data = {"stars": 1, "description": "Hacked!"}
        response = self.client.patch(
            f"{self.base_url}{review.id}/", update_data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_review_unauthenticated(self):
        review = VendorReviewFactory(vendor=self.vendor, user=self.user)
        update_data = {"stars": 1}
        response = self.client.patch(
            f"{self.base_url}{review.id}/", update_data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_delete_own_review(self):
        review = VendorReviewFactory(vendor=self.vendor, user=self.user)
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(f"{self.base_url}{review.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(VendorReview.objects.filter(id=review.id).exists())

    def test_delete_other_users_review_forbidden(self):
        review = VendorReviewFactory(
            vendor=self.vendor,
            user=self.other_user,
            status=VendorReview.Status.APPROVED,
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(f"{self.base_url}{review.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_new_review_defaults_to_pending(self):
        self.client.force_authenticate(user=self.user)
        review_data = {
            "stars": 5,
            "description": "Great service!",
        }
        response = self.client.post(self.base_url, review_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "pending")

    def test_unauthenticated_users_only_see_approved_reviews(self):
        approved_review = VendorReviewFactory(
            vendor=self.vendor, status=VendorReview.Status.APPROVED
        )
        pending_review = VendorReviewFactory(
            vendor=self.vendor, status=VendorReview.Status.PENDING
        )

        response = self.client.get(self.base_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        review_ids = [r["id"] for r in response.data["results"]]
        self.assertIn(approved_review.id, review_ids)
        self.assertNotIn(pending_review.id, review_ids)

    def test_authenticated_users_see_approved_and_own_pending_reviews(self):
        approved_review = VendorReviewFactory(
            vendor=self.vendor, status=VendorReview.Status.APPROVED
        )
        own_pending_review = VendorReviewFactory(
            vendor=self.vendor, user=self.user, status=VendorReview.Status.PENDING
        )
        other_pending_review = VendorReviewFactory(
            vendor=self.vendor, user=self.other_user, status=VendorReview.Status.PENDING
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.base_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        review_ids = [r["id"] for r in response.data["results"]]
        self.assertIn(approved_review.id, review_ids)
        self.assertIn(own_pending_review.id, review_ids)
        self.assertNotIn(other_pending_review.id, review_ids)
        self.assertEqual(response.data["count"], 1)

    def test_authenticated_users_see_own_rejected_reviews(self):
        """Test that authenticated users can see their own rejected reviews."""
        approved_review = VendorReviewFactory(
            vendor=self.vendor, status=VendorReview.Status.APPROVED
        )
        own_rejected_review = VendorReviewFactory(
            vendor=self.vendor, user=self.user, status=VendorReview.Status.REJECTED
        )
        other_rejected_review = VendorReviewFactory(
            vendor=self.vendor,
            user=self.other_user,
            status=VendorReview.Status.REJECTED,
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.base_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        review_ids = [r["id"] for r in response.data["results"]]
        self.assertIn(approved_review.id, review_ids)
        self.assertIn(own_rejected_review.id, review_ids)
        self.assertNotIn(other_rejected_review.id, review_ids)
        self.assertEqual(response.data["count"], 1)
        rejected_review_data = next(
            r for r in response.data["results"] if r["id"] == own_rejected_review.id
        )
        self.assertEqual(rejected_review_data["status"], "rejected")

    def test_rejected_reviews_not_counted_in_rating_or_review_count(self):
        """Test that rejected reviews don't affect vendor ratings or review counts."""
        vendor = VendorDirectoryFactory()
        VendorReviewFactory(vendor=vendor, stars=5, status=VendorReview.Status.APPROVED)
        VendorReviewFactory(vendor=vendor, stars=4, status=VendorReview.Status.APPROVED)
        VendorReviewFactory(vendor=vendor, stars=1, status=VendorReview.Status.REJECTED)
        VendorReviewFactory(vendor=vendor, stars=2, status=VendorReview.Status.REJECTED)

        response = self.client.get(f"/api/directory/vendors/{vendor.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(response.data["rating"], 4.5)
        self.assertEqual(response.data["reviews"], 2)

    def test_authenticated_users_can_see_status_of_their_reviews(self):
        """Test that authenticated users can see the status field in their reviews."""
        self.client.force_authenticate(user=self.user)
        review_data = {
            "stars": 5,
            "description": "Great service!",
        }
        response = self.client.post(self.base_url, review_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("status", response.data)
        self.assertEqual(response.data["status"], "pending")
        self.assertTrue(VendorReview.objects.filter(id=response.data["id"]).exists())

    def test_delete_review_unauthenticated(self):
        review = VendorReviewFactory(vendor=self.vendor, user=self.user)
        response = self.client.delete(f"{self.base_url}{review.id}/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertTrue(VendorReview.objects.filter(id=review.id).exists())

    def test_delete_nonexistent_review(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(f"{self.base_url}99999/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class VendorDirectoryModelTests(TestCase):
    def test_create_vendor(self):
        vendor = VendorDirectoryFactory()
        self.assertIsNotNone(vendor.id)
        self.assertIn("Vendor Legal Name", vendor.legal_name)

    def test_vendor_str_with_dba(self):
        vendor = VendorDirectoryFactory(dba="Test DBA", legal_name="Test Legal")
        self.assertEqual(str(vendor), "Test DBA")

    def test_vendor_str_without_dba(self):
        vendor = VendorDirectoryFactory(dba="", legal_name="Test Legal")
        self.assertEqual(str(vendor), "Test Legal")

    def test_display_name_with_dba(self):
        vendor = VendorDirectoryFactory(dba="Display DBA", legal_name="Legal Name")
        self.assertEqual(vendor.display_name, "Display DBA")

    def test_display_name_without_dba(self):
        vendor = VendorDirectoryFactory(dba="", legal_name="Legal Name")
        self.assertEqual(vendor.display_name, "Legal Name")

    def test_vendor_type_choices(self):
        self.assertEqual(VendorDirectory.VendorType.PSA, "PSA")
        self.assertEqual(VendorDirectory.VendorType.NON, "NON")
        self.assertEqual(VendorDirectory.VendorType.OTHER, "OTHER")

    def test_vendor_ordering(self):
        VendorDirectoryFactory(legal_name="Zebra Corp")
        VendorDirectoryFactory(legal_name="Alpha Inc")
        vendors = VendorDirectory.objects.all()
        self.assertEqual(vendors[0].legal_name, "Alpha Inc")
        self.assertEqual(vendors[1].legal_name, "Zebra Corp")


class VendorCountyServiceModelTests(TestCase):
    def test_create_county_service(self):
        county_service = VendorCountyServiceFactory()
        self.assertIsNotNone(county_service.id)
        self.assertIsNotNone(county_service.vendor)
        self.assertIsNotNone(county_service.county)
        self.assertIsNotNone(county_service.service)

    def test_county_service_str(self):
        vendor = VendorDirectoryFactory(legal_name="Test Vendor", dba="")
        county = CountyFactory(name="Test County")
        service = ServiceTypeTestFactory(name="Test Service")
        county_service = VendorCountyServiceFactory(
            vendor=vendor, county=county, service=service
        )
        self.assertIn("Test Vendor", str(county_service))
        self.assertIn("Test County", str(county_service))
        self.assertIn("Test Service", str(county_service))

    def test_unique_together_constraint(self):
        county_service = VendorCountyServiceFactory()
        with self.assertRaises(Exception):
            VendorCountyServiceFactory(
                vendor=county_service.vendor,
                county=county_service.county,
                service=county_service.service,
            )


class FavoriteVendorModelTests(TestCase):
    def setUp(self):
        self.account = AccountFactory()
        self.user = UserFactory(account=self.account)

    def test_create_favorite(self):
        vendor = VendorDirectoryFactory()
        favorite = FavoriteVendor.objects.create(user=self.user, vendor=vendor)
        self.assertIsNotNone(favorite.id)
        self.assertEqual(favorite.user, self.user)
        self.assertEqual(favorite.vendor, vendor)

    def test_favorite_str(self):
        vendor = VendorDirectoryFactory(legal_name="Fav Vendor", dba="")
        favorite = FavoriteVendor.objects.create(user=self.user, vendor=vendor)
        self.assertIn(str(self.user), str(favorite))
        self.assertIn("Fav Vendor", str(favorite))

    def test_unique_together_constraint(self):
        vendor = VendorDirectoryFactory()
        FavoriteVendor.objects.create(user=self.user, vendor=vendor)
        with self.assertRaises(Exception):
            FavoriteVendor.objects.create(user=self.user, vendor=vendor)

    def test_cascade_delete_on_vendor(self):
        vendor = VendorDirectoryFactory()
        FavoriteVendor.objects.create(user=self.user, vendor=vendor)
        vendor_id = vendor.id
        vendor.delete()
        self.assertFalse(FavoriteVendor.objects.filter(vendor_id=vendor_id).exists())


class VendorDirectorySerializerTests(TestCase):
    def setUp(self):
        self.account = AccountFactory()
        self.user = UserFactory(account=self.account)
        self.vendor = VendorDirectoryFactory()
        self.county = CountyFactory(name="Serializer County")
        self.service = ServiceTypeTestFactory(name="Serializer Service")
        VendorCountyServiceFactory(
            vendor=self.vendor, county=self.county, service=self.service
        )

    def test_list_serializer_fields(self):
        class MockRequest:
            user = self.user

        serializer = VendorDirectoryListSerializer(
            self.vendor, context={"request": MockRequest()}
        )
        data = serializer.data
        self.assertIn("id", data)
        self.assertIn("legal_name", data)
        self.assertIn("dba", data)
        self.assertIn("display_name", data)
        self.assertIn("vendor_type", data)
        self.assertIn("is_favorite", data)
        self.assertIn("counties", data)
        self.assertIn("services", data)

    def test_list_serializer_is_favorite_false(self):
        class MockRequest:
            user = self.user

        serializer = VendorDirectoryListSerializer(
            self.vendor, context={"request": MockRequest()}
        )
        self.assertFalse(serializer.data["is_favorite"])

    def test_list_serializer_is_favorite_true(self):
        FavoriteVendor.objects.create(user=self.user, vendor=self.vendor)

        class MockRequest:
            user = self.user

        serializer = VendorDirectoryListSerializer(
            self.vendor, context={"request": MockRequest()}
        )
        self.assertTrue(serializer.data["is_favorite"])

    def test_list_serializer_is_favorite_unauthenticated(self):
        class AnonymousUser:
            is_authenticated = False

        class MockRequest:
            user = AnonymousUser()

        serializer = VendorDirectoryListSerializer(
            self.vendor, context={"request": MockRequest()}
        )
        self.assertFalse(serializer.data["is_favorite"])

    def test_detail_serializer_has_extra_fields(self):
        class MockRequest:
            user = self.user

        serializer = VendorDirectoryDetailSerializer(
            self.vendor, context={"request": MockRequest()}
        )
        data = serializer.data
        self.assertIn("email", data)
        self.assertIn("noa_email", data)
        self.assertIn("contact_person", data)
        self.assertIn("county_services", data)
        self.assertIn("created_at", data)
        self.assertIn("updated_at", data)

    def test_counties_serialization(self):
        class MockRequest:
            user = self.user

        serializer = VendorDirectoryListSerializer(
            self.vendor, context={"request": MockRequest()}
        )
        counties = serializer.data["counties"]
        self.assertEqual(len(counties), 1)
        self.assertEqual(counties[0]["name"], "Serializer County")

    def test_services_serialization(self):
        class MockRequest:
            user = self.user

        serializer = VendorDirectoryListSerializer(
            self.vendor, context={"request": MockRequest()}
        )
        services = serializer.data["services"]
        self.assertEqual(len(services), 1)
        self.assertEqual(services[0]["name"], "Serializer Service")


class VendorCountyServiceSerializerTests(TestCase):
    def test_serializer_fields(self):
        county_service = VendorCountyServiceFactory()
        serializer = VendorCountyServiceSerializer(county_service)
        data = serializer.data
        self.assertIn("id", data)
        self.assertIn("county", data)
        self.assertIn("county_name", data)
        self.assertIn("service", data)
        self.assertIn("service_name", data)


class FavoriteVendorSerializerTests(TestCase):
    def setUp(self):
        self.account = AccountFactory()
        self.user = UserFactory(account=self.account)
        self.vendor = VendorDirectoryFactory()

    def test_serializer_read_fields(self):
        favorite = FavoriteVendor.objects.create(user=self.user, vendor=self.vendor)

        class MockRequest:
            user = self.user

        serializer = FavoriteVendorSerializer(
            favorite, context={"request": MockRequest()}
        )
        data = serializer.data
        self.assertIn("id", data)
        self.assertIn("vendor", data)
        self.assertIn("created_at", data)
        self.assertIsInstance(data["vendor"], dict)

    def test_serializer_create(self):
        class MockRequest:
            user = self.user

        serializer = FavoriteVendorSerializer(
            data={"vendor_id": self.vendor.id}, context={"request": MockRequest()}
        )
        self.assertTrue(serializer.is_valid())
        favorite = serializer.save()
        self.assertEqual(favorite.user, self.user)
        self.assertEqual(favorite.vendor, self.vendor)

    def test_serializer_create_idempotent(self):
        FavoriteVendor.objects.create(user=self.user, vendor=self.vendor)

        class MockRequest:
            user = self.user

        serializer = FavoriteVendorSerializer(
            data={"vendor_id": self.vendor.id}, context={"request": MockRequest()}
        )
        self.assertTrue(serializer.is_valid())
        serializer.save()
        self.assertEqual(
            FavoriteVendor.objects.filter(user=self.user, vendor=self.vendor).count(), 1
        )


class VendorDirectoryAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.account = AccountFactory()
        self.user = UserFactory(account=self.account)
        self.vendor1 = VendorDirectoryFactory(legal_name="Vendor A")
        self.vendor2 = VendorDirectoryFactory(legal_name="Vendor B")
        self.vendor3 = VendorDirectoryFactory(legal_name="Vendor C")

    def test_list_vendors_unauthenticated(self):
        response = self.client.get("/api/directory/vendors/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_vendors_authenticated(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/directory/vendors/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_vendors_returns_results(self):
        response = self.client.get("/api/directory/vendors/?limit=10")
        self.assertIn("results", response.data)
        self.assertEqual(len(response.data["results"]), 3)

    def test_retrieve_vendor_unauthenticated(self):
        response = self.client.get(f"/api/directory/vendors/{self.vendor1.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_retrieve_vendor_authenticated(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f"/api/directory/vendors/{self.vendor1.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_retrieve_vendor_detail_fields(self):
        response = self.client.get(f"/api/directory/vendors/{self.vendor1.id}/")
        self.assertIn("email", response.data)
        self.assertIn("county_services", response.data)
        self.assertIn("created_at", response.data)

    def test_retrieve_vendor_not_found(self):
        response = self.client.get("/api/directory/vendors/99999/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class VendorDirectoryPaginationTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        for i in range(25):
            VendorDirectoryFactory(legal_name=f"Vendor {i:02d}")

    def test_pagination_limit(self):
        response = self.client.get("/api/directory/vendors/?limit=10")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 10)

    def test_pagination_offset(self):
        response = self.client.get("/api/directory/vendors/?limit=10&offset=10")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 10)

    def test_pagination_last_page(self):
        response = self.client.get("/api/directory/vendors/?limit=10&offset=20")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 5)

    def test_pagination_count(self):
        response = self.client.get("/api/directory/vendors/?limit=10")
        self.assertEqual(response.data["count"], 25)

    def test_pagination_next_link(self):
        response = self.client.get("/api/directory/vendors/?limit=10")
        self.assertIsNotNone(response.data["next"])

    def test_pagination_previous_link(self):
        response = self.client.get("/api/directory/vendors/?limit=10&offset=10")
        self.assertIsNotNone(response.data["previous"])

    def test_pagination_beyond_results(self):
        response = self.client.get("/api/directory/vendors/?limit=10&offset=100")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 0)


class FavoriteVendorAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.account = AccountFactory()
        self.user = UserFactory(account=self.account)
        self.other_user = UserFactory(account=self.account, email="other@example.com")
        self.vendor1 = VendorDirectoryFactory()
        self.vendor2 = VendorDirectoryFactory()

    def test_list_favorites_unauthenticated(self):
        response = self.client.get("/api/directory/favorites/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_favorites_authenticated_empty(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/directory/favorites/?limit=10")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 0)

    def test_list_favorites_authenticated_with_favorites(self):
        FavoriteVendor.objects.create(user=self.user, vendor=self.vendor1)
        FavoriteVendor.objects.create(user=self.user, vendor=self.vendor2)
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/directory/favorites/?limit=10")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 2)

    def test_list_favorites_only_returns_own_favorites(self):
        FavoriteVendor.objects.create(user=self.user, vendor=self.vendor1)
        FavoriteVendor.objects.create(user=self.other_user, vendor=self.vendor2)
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/directory/favorites/?limit=10")
        self.assertEqual(len(response.data["results"]), 1)

    def test_create_favorite_unauthenticated(self):
        response = self.client.post(
            "/api/directory/favorites/", {"vendor_id": self.vendor1.id}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_favorite_authenticated(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            "/api/directory/favorites/", {"vendor_id": self.vendor1.id}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            FavoriteVendor.objects.filter(user=self.user, vendor=self.vendor1).exists()
        )

    def test_create_favorite_idempotent(self):
        FavoriteVendor.objects.create(user=self.user, vendor=self.vendor1)
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            "/api/directory/favorites/", {"vendor_id": self.vendor1.id}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            FavoriteVendor.objects.filter(user=self.user, vendor=self.vendor1).count(),
            1,
        )

    def test_create_favorite_invalid_vendor(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            "/api/directory/favorites/", {"vendor_id": 99999}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_favorite_missing_vendor_id(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post("/api/directory/favorites/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_favorite_unauthenticated(self):
        FavoriteVendor.objects.create(user=self.user, vendor=self.vendor1)
        response = self.client.delete(f"/api/directory/favorites/{self.vendor1.id}/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_delete_favorite_authenticated(self):
        FavoriteVendor.objects.create(user=self.user, vendor=self.vendor1)
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(f"/api/directory/favorites/{self.vendor1.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            FavoriteVendor.objects.filter(user=self.user, vendor=self.vendor1).exists()
        )

    def test_delete_favorite_nonexistent(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(f"/api/directory/favorites/{self.vendor1.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_delete_favorite_other_user(self):
        FavoriteVendor.objects.create(user=self.other_user, vendor=self.vendor1)
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(f"/api/directory/favorites/{self.vendor1.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertTrue(
            FavoriteVendor.objects.filter(
                user=self.other_user, vendor=self.vendor1
            ).exists()
        )


class IsFavoriteIntegrationTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.account = AccountFactory()
        self.user = UserFactory(account=self.account)
        self.vendor = VendorDirectoryFactory()

    def test_is_favorite_flow(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f"/api/directory/vendors/{self.vendor.id}/")
        self.assertFalse(response.data["is_favorite"])
        response = self.client.post(
            "/api/directory/favorites/", {"vendor_id": self.vendor.id}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        response = self.client.get(f"/api/directory/vendors/{self.vendor.id}/")
        self.assertTrue(response.data["is_favorite"])
        response = self.client.delete(f"/api/directory/favorites/{self.vendor.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        response = self.client.get(f"/api/directory/vendors/{self.vendor.id}/")
        self.assertFalse(response.data["is_favorite"])

    def test_is_favorite_list_view(self):
        vendor2 = VendorDirectoryFactory()
        FavoriteVendor.objects.create(user=self.user, vendor=self.vendor)
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/directory/vendors/?limit=10")
        results = {v["id"]: v["is_favorite"] for v in response.data["results"]}
        self.assertTrue(results[self.vendor.id])
        self.assertFalse(results[vendor2.id])


class VendorClaimModelTests(TestCase):
    def setUp(self):
        self.account = AccountFactory()
        self.user = UserFactory(account=self.account)
        self.vendor = VendorDirectoryFactory()

    def test_create_claim(self):
        claim = VendorClaimFactory(vendor=self.vendor, user=self.user)
        self.assertIsNotNone(claim.id)
        self.assertEqual(claim.status, VendorClaim.Status.PENDING)

    def test_claim_str(self):
        claim = VendorClaimFactory(
            vendor=self.vendor, user=self.user, claimant_name="John Doe"
        )
        self.assertIn("John Doe", str(claim))
        self.assertIn("pending", str(claim))

    def test_claim_status_choices(self):
        self.assertEqual(VendorClaim.Status.PENDING, "pending")
        self.assertEqual(VendorClaim.Status.APPROVED, "approved")
        self.assertEqual(VendorClaim.Status.REJECTED, "rejected")

    def test_claim_ordering(self):
        import time

        claim1 = VendorClaimFactory(vendor=self.vendor, user=self.user)
        # Add small delay to ensure different timestamps
        time.sleep(0.01)
        claim2 = VendorClaimFactory(vendor=self.vendor, user=self.user)
        claims = VendorClaim.objects.all()
        # Claims should be ordered by -created_at (newest first)
        # So claim2 (created second) should be first
        self.assertEqual(claims[0].id, claim2.id)
        self.assertEqual(claims[1].id, claim1.id)

    def test_cascade_delete_on_vendor(self):
        claim = VendorClaimFactory(vendor=self.vendor, user=self.user)
        claim_id = claim.id
        self.vendor.delete()
        self.assertFalse(VendorClaim.objects.filter(id=claim_id).exists())

    def test_cascade_delete_on_user(self):
        claim = VendorClaimFactory(vendor=self.vendor, user=self.user)
        claim_id = claim.id
        self.user.delete()
        self.assertFalse(VendorClaim.objects.filter(id=claim_id).exists())

    def test_claimed_by_set_null(self):
        self.vendor.claimed_by = self.user
        self.vendor.claim_status = VendorDirectory.ClaimStatus.CLAIMED
        self.vendor.save()
        self.user.delete()
        self.vendor.refresh_from_db()
        self.assertIsNone(self.vendor.claimed_by)


class VendorClaimDocumentModelTests(TestCase):
    def setUp(self):
        self.account = AccountFactory()
        self.user = UserFactory(account=self.account)
        self.vendor = VendorDirectoryFactory()
        self.claim = VendorClaimFactory(vendor=self.vendor, user=self.user)

    def test_create_document(self):
        doc = VendorClaimDocumentFactory(claim=self.claim)
        self.assertIsNotNone(doc.id)
        self.assertEqual(doc.file_type, "pdf")

    def test_document_str(self):
        doc = VendorClaimDocumentFactory(
            claim=self.claim, original_filename="my_document.pdf"
        )
        self.assertEqual(str(doc), "my_document.pdf")

    def test_allowed_file_types(self):
        expected = ["pdf", "jpg", "jpeg", "png", "gif", "bmp"]
        self.assertEqual(VendorClaimDocument.ALLOWED_FILE_TYPES, expected)

    def test_cascade_delete_on_claim(self):
        doc = VendorClaimDocumentFactory(claim=self.claim)
        doc_id = doc.id
        self.claim.delete()
        self.assertFalse(VendorClaimDocument.objects.filter(id=doc_id).exists())


class VendorClaimAPIAuthenticationTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.account = AccountFactory()
        self.user = UserFactory(account=self.account)
        self.vendor = VendorDirectoryFactory()
        self.base_url = f"/api/directory/vendors/{self.vendor.id}/claim/"

    def _create_test_file(self, name="test.pdf", content=b"PDF content", size=None):
        if size:
            content = b"x" * size
        return SimpleUploadedFile(name, content, content_type="application/pdf")

    def test_submit_claim_without_authentication(self):
        data = {
            "claimant_name": "John Doe",
            "claimant_email": "john@example.com",
            "claimant_phone": "555-123-4567",
        }
        response = self.client.post(self.base_url, data, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch(
        "duett_api.directory.views.upload_to_s3",
        return_value="https://example.com/test.pdf",
    )
    @patch("duett_api.directory.views.VendorClaimViewSet._send_claim_submitted_emails")
    def test_submit_claim_with_valid_token(self, mock_send_emails, mock_upload):
        self.client.force_authenticate(user=self.user)
        data = {
            "claimant_name": "John Doe",
            "claimant_email": "john@example.com",
            "claimant_phone": "555-123-4567",
            "documents": [self._create_test_file()],
        }
        response = self.client.post(self.base_url, data, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class VendorClaimAPIValidationTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.account = AccountFactory()
        self.user = UserFactory(account=self.account)
        self.vendor = VendorDirectoryFactory()
        self.base_url = f"/api/directory/vendors/{self.vendor.id}/claim/"
        self.client.force_authenticate(user=self.user)

    def _create_test_file(self, name="test.pdf", content=b"PDF content"):
        return SimpleUploadedFile(name, content, content_type="application/pdf")

    def test_missing_claimant_name(self):
        data = {
            "claimant_email": "john@example.com",
            "claimant_phone": "555-123-4567",
            "documents": [self._create_test_file()],
        }
        response = self.client.post(self.base_url, data, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("claimant_name", response.data)

    def test_missing_claimant_email(self):
        data = {
            "claimant_name": "John Doe",
            "claimant_phone": "555-123-4567",
            "documents": [self._create_test_file()],
        }
        response = self.client.post(self.base_url, data, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("claimant_email", response.data)

    def test_missing_claimant_phone(self):
        data = {
            "claimant_name": "John Doe",
            "claimant_email": "john@example.com",
            "documents": [self._create_test_file()],
        }
        response = self.client.post(self.base_url, data, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("claimant_phone", response.data)

    def test_missing_documents(self):
        data = {
            "claimant_name": "John Doe",
            "claimant_email": "john@example.com",
            "claimant_phone": "555-123-4567",
        }
        response = self.client.post(self.base_url, data, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("documents", response.data)

    def test_invalid_email_format(self):
        data = {
            "claimant_name": "John Doe",
            "claimant_email": "notanemail",
            "claimant_phone": "555-123-4567",
            "documents": [self._create_test_file()],
        }
        response = self.client.post(self.base_url, data, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("claimant_email", response.data)

    def test_empty_documents_array(self):
        data = {
            "claimant_name": "John Doe",
            "claimant_email": "john@example.com",
            "claimant_phone": "555-123-4567",
            "documents": [],
        }
        response = self.client.post(self.base_url, data, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class VendorClaimAPIFileUploadTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.account = AccountFactory()
        self.user = UserFactory(account=self.account)
        self.vendor = VendorDirectoryFactory()
        self.base_url = f"/api/directory/vendors/{self.vendor.id}/claim/"
        self.client.force_authenticate(user=self.user)

    def _create_test_file(self, name="test.pdf", content=b"PDF content", size=None):
        if size:
            content = b"x" * size
        return SimpleUploadedFile(
            name, content, content_type="application/octet-stream"
        )

    def _base_data(self, files):
        return {
            "claimant_name": "John Doe",
            "claimant_email": "john@example.com",
            "claimant_phone": "555-123-4567",
            "documents": files,
        }

    @patch(
        "duett_api.directory.views.upload_to_s3",
        return_value="https://example.com/test.pdf",
    )
    @patch("duett_api.directory.views.VendorClaimViewSet._send_claim_submitted_emails")
    def test_valid_file_types(self, mock_send_emails, mock_upload):
        files = [
            self._create_test_file("doc.pdf"),
            self._create_test_file("image.jpg"),
            self._create_test_file("photo.png"),
        ]
        response = self.client.post(
            self.base_url,
            self._base_data(files),
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_invalid_file_type(self):
        response = self.client.post(
            self.base_url,
            self._base_data([self._create_test_file("malware.exe")]),
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_file_exceeds_10mb(self):
        large_file = self._create_test_file("large.pdf", size=15 * 1024 * 1024)
        response = self.client.post(
            self.base_url,
            self._base_data([large_file]),
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_too_many_files(self):
        files = [self._create_test_file(f"doc{i}.pdf") for i in range(6)]
        response = self.client.post(
            self.base_url,
            self._base_data(files),
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class VendorClaimAPIBusinessLogicTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.account = AccountFactory()
        self.user = UserFactory(account=self.account)
        self.other_user = UserFactory(account=self.account, email="other@example.com")
        self.vendor = VendorDirectoryFactory()
        self.base_url = f"/api/directory/vendors/{self.vendor.id}/claim/"
        self.client.force_authenticate(user=self.user)

    def _create_test_file(self, name="test.pdf"):
        return SimpleUploadedFile(name, b"PDF content", content_type="application/pdf")

    def _base_data(self):
        return {
            "claimant_name": "John Doe",
            "claimant_email": "john@example.com",
            "claimant_phone": "555-123-4567",
            "documents": [self._create_test_file()],
        }

    @patch(
        "duett_api.directory.views.upload_to_s3",
        return_value="https://example.com/test.pdf",
    )
    @patch("duett_api.directory.views.VendorClaimViewSet._send_claim_submitted_emails")
    def test_claim_unclaimed_vendor(self, mock_send_emails, mock_upload):
        self.assertIsNone(self.vendor.claim_status)
        response = self.client.post(
            self.base_url, self._base_data(), format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.vendor.refresh_from_db()
        self.assertEqual(self.vendor.claim_status, VendorDirectory.ClaimStatus.PENDING)

    def test_claim_already_claimed_vendor(self):
        self.vendor.claim_status = VendorDirectory.ClaimStatus.CLAIMED
        self.vendor.claimed_by = self.other_user
        self.vendor.save()
        response = self.client.post(
            self.base_url, self._base_data(), format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn("already been claimed", response.data["detail"])

    @patch(
        "duett_api.directory.views.upload_to_s3",
        return_value="https://example.com/test.pdf",
    )
    @patch("duett_api.directory.views.VendorClaimViewSet._send_claim_submitted_emails")
    def test_claim_vendor_with_pending_claim_same_user(
        self, mock_send_emails, mock_upload
    ):
        VendorClaimFactory(
            vendor=self.vendor, user=self.user, status=VendorClaim.Status.PENDING
        )
        response = self.client.post(
            self.base_url, self._base_data(), format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn("pending claim", response.data["detail"])

    @patch(
        "duett_api.directory.views.upload_to_s3",
        return_value="https://example.com/test.pdf",
    )
    @patch("duett_api.directory.views.VendorClaimViewSet._send_claim_submitted_emails")
    def test_claim_vendor_with_pending_claim_different_user(
        self, mock_send_emails, mock_upload
    ):
        VendorClaimFactory(
            vendor=self.vendor, user=self.other_user, status=VendorClaim.Status.PENDING
        )
        response = self.client.post(
            self.base_url, self._base_data(), format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    @patch(
        "duett_api.directory.views.upload_to_s3",
        return_value="https://example.com/test.pdf",
    )
    @patch("duett_api.directory.views.VendorClaimViewSet._send_claim_submitted_emails")
    def test_resubmit_after_rejection(self, mock_send_emails, mock_upload):
        VendorClaimFactory(
            vendor=self.vendor, user=self.user, status=VendorClaim.Status.REJECTED
        )
        response = self.client.post(
            self.base_url, self._base_data(), format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    @patch(
        "duett_api.directory.views.upload_to_s3",
        return_value="https://example.com/test.pdf",
    )
    @patch("duett_api.directory.views.VendorClaimViewSet._send_claim_submitted_emails")
    def test_user_claims_multiple_vendors(self, mock_send_emails, mock_upload):
        other_vendor = VendorDirectoryFactory()
        other_vendor.claimed_by = self.user
        other_vendor.claim_status = VendorDirectory.ClaimStatus.CLAIMED
        other_vendor.save()
        response = self.client.post(
            self.base_url, self._base_data(), format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_claim_nonexistent_vendor(self):
        url = "/api/directory/vendors/99999/claim/"
        response = self.client.post(url, self._base_data(), format="multipart")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class VendorClaimStatusAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.account = AccountFactory()
        self.user = UserFactory(account=self.account)
        self.other_user = UserFactory(account=self.account, email="other@example.com")
        self.vendor = VendorDirectoryFactory()
        self.status_url = f"/api/directory/vendors/{self.vendor.id}/claim/status/"

    def test_claim_status_unauthenticated(self):
        response = self.client.get(self.status_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_claim_status_no_pending_claim(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.status_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["has_pending_claim"])
        self.assertIsNone(response.data["claim_id"])
        self.assertIsNone(response.data["submitted_at"])

    def test_claim_status_with_pending_claim(self):
        claim = VendorClaimFactory(
            vendor=self.vendor, user=self.user, status=VendorClaim.Status.PENDING
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.status_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["has_pending_claim"])
        self.assertEqual(response.data["claim_id"], claim.id)
        self.assertIsNotNone(response.data["submitted_at"])

    def test_claim_status_with_rejected_claim(self):
        VendorClaimFactory(
            vendor=self.vendor, user=self.user, status=VendorClaim.Status.REJECTED
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.status_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["has_pending_claim"])

    def test_claim_status_with_approved_claim(self):
        VendorClaimFactory(
            vendor=self.vendor, user=self.user, status=VendorClaim.Status.APPROVED
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.status_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["has_pending_claim"])

    def test_claim_status_other_user_pending_claim(self):
        VendorClaimFactory(
            vendor=self.vendor, user=self.other_user, status=VendorClaim.Status.PENDING
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.status_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["has_pending_claim"])

    def test_claim_status_nonexistent_vendor(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/directory/vendors/99999/claim/status/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class VendorClaimAPIResponseFormatTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.account = AccountFactory()
        self.user = UserFactory(account=self.account)
        self.vendor = VendorDirectoryFactory()
        self.base_url = f"/api/directory/vendors/{self.vendor.id}/claim/"
        self.client.force_authenticate(user=self.user)

    def _create_test_file(self):
        return SimpleUploadedFile(
            "test.pdf", b"PDF content", content_type="application/pdf"
        )

    @patch(
        "duett_api.directory.views.upload_to_s3",
        return_value="https://example.com/test.pdf",
    )
    @patch("duett_api.directory.views.VendorClaimViewSet._send_claim_submitted_emails")
    def test_successful_claim_submission_response(self, mock_send_emails, mock_upload):
        data = {
            "claimant_name": "John Doe",
            "claimant_email": "john@example.com",
            "claimant_phone": "555-123-4567",
            "documents": [self._create_test_file()],
        }
        response = self.client.post(self.base_url, data, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("id", response.data)
        self.assertIn("vendor", response.data)
        self.assertIn("status", response.data)
        self.assertEqual(response.data["status"], "pending")
        self.assertIn("message", response.data)
        self.assertIn("created_at", response.data)

    def test_vendor_detail_includes_claim_status(self):
        response = self.client.get(f"/api/directory/vendors/{self.vendor.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("claim_status", response.data)
        self.assertIn("claimed_by", response.data)


class VendorClaimSerializerTests(TestCase):
    def setUp(self):
        self.account = AccountFactory()
        self.user = UserFactory(account=self.account)
        self.vendor = VendorDirectoryFactory()
        self.claim = VendorClaimFactory(vendor=self.vendor, user=self.user)

    def test_claim_serializer_fields(self):
        serializer = VendorClaimSerializer(self.claim)
        data = serializer.data
        self.assertIn("id", data)
        self.assertIn("vendor", data)
        self.assertIn("claimant_name", data)
        self.assertIn("claimant_email", data)
        self.assertIn("claimant_phone", data)
        self.assertIn("status", data)
        self.assertIn("documents", data)
        self.assertIn("created_at", data)

    def test_claim_response_serializer_message(self):
        serializer = VendorClaimResponseSerializer(self.claim)
        data = serializer.data
        self.assertIn("message", data)
        self.assertEqual(
            data["message"], "Your claim has been submitted and is pending review."
        )

    def test_claim_submit_serializer_valid(self):
        file = SimpleUploadedFile(
            "test.pdf", b"PDF content", content_type="application/pdf"
        )
        data = {
            "claimant_name": "John Doe",
            "claimant_email": "john@example.com",
            "claimant_phone": "555-123-4567",
            "documents": [file],
        }
        serializer = VendorClaimSubmitSerializer(data=data)
        self.assertTrue(serializer.is_valid())

    def test_claim_submit_serializer_invalid_file_type(self):
        file = SimpleUploadedFile(
            "test.exe", b"EXE content", content_type="application/octet-stream"
        )
        data = {
            "claimant_name": "John Doe",
            "claimant_email": "john@example.com",
            "claimant_phone": "555-123-4567",
            "documents": [file],
        }
        serializer = VendorClaimSubmitSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("documents", serializer.errors)


class VendorClaimAdminTests(TestCase):
    def setUp(self):
        self.site = AdminSite()
        self.admin = VendorClaimAdmin(VendorClaim, self.site)
        self.factory = RequestFactory()
        self.account = AccountFactory()
        self.admin_user = UserFactory(
            account=self.account, is_staff=True, is_superuser=True
        )
        self.user = UserFactory(account=self.account, email="claimant@example.com")
        self.vendor = VendorDirectoryFactory()
        self.claim = VendorClaimFactory(
            vendor=self.vendor,
            user=self.user,
            claimant_name="Test Claimant",
            claimant_email="claimant@example.com",
            status=VendorClaim.Status.PENDING,
        )

    @patch("duett_api.directory.admin.VendorClaimAdmin.message_user")
    @patch("duett_api.directory.admin.EmailMessage")
    def test_approve_claims_action(self, mock_email_class, mock_message_user):
        mock_email_instance = MagicMock()
        mock_email_class.return_value = mock_email_instance
        request = self.factory.post("/admin/")
        request.user = self.admin_user
        queryset = VendorClaim.objects.filter(id=self.claim.id)
        self.admin.approve_claims(request, queryset)
        self.claim.refresh_from_db()
        self.vendor.refresh_from_db()
        self.assertEqual(self.claim.status, VendorClaim.Status.APPROVED)
        self.assertEqual(self.claim.reviewed_by, self.admin_user)
        self.assertIsNotNone(self.claim.reviewed_at)
        self.assertEqual(self.vendor.claim_status, "claimed")
        self.assertEqual(self.vendor.claimed_by, self.user)

    @patch("duett_api.directory.admin.VendorClaimAdmin.message_user")
    @patch("duett_api.directory.admin.EmailMessage")
    def test_reject_claims_action(self, mock_email_class, mock_message_user):
        mock_email_instance = MagicMock()
        mock_email_class.return_value = mock_email_instance
        request = self.factory.post("/admin/")
        request.user = self.admin_user
        queryset = VendorClaim.objects.filter(id=self.claim.id)
        self.admin.reject_claims(request, queryset)
        self.claim.refresh_from_db()
        self.vendor.refresh_from_db()
        self.assertEqual(self.claim.status, VendorClaim.Status.REJECTED)
        self.assertEqual(self.claim.reviewed_by, self.admin_user)
        self.assertIsNotNone(self.claim.reviewed_at)
        self.assertIsNone(self.vendor.claim_status)

    @patch("duett_api.directory.admin.VendorClaimAdmin.message_user")
    def test_approve_only_pending_claims(self, mock_message_user):
        self.claim.status = VendorClaim.Status.APPROVED
        self.claim.save()
        request = self.factory.post("/admin/")
        request.user = self.admin_user
        queryset = VendorClaim.objects.filter(id=self.claim.id)
        with patch.object(self.admin, "_handle_approval") as mock_approval:
            self.admin.approve_claims(request, queryset)
            mock_approval.assert_not_called()


class VendorClaimEmailTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.account = AccountFactory()
        self.user = UserFactory(account=self.account)
        self.vendor = VendorDirectoryFactory()
        self.base_url = f"/api/directory/vendors/{self.vendor.id}/claim/"
        self.client.force_authenticate(user=self.user)

    def _create_test_file(self):
        return SimpleUploadedFile(
            "test.pdf", b"PDF content", content_type="application/pdf"
        )

    @patch(
        "duett_api.directory.views.upload_to_s3",
        return_value="https://example.com/test.pdf",
    )
    @patch("duett_api.directory.views.EmailMessage")
    def test_claim_submitted_sends_claimant_email(self, mock_email_class, mock_upload):
        mock_email_instance = MagicMock()
        mock_email_class.return_value = mock_email_instance
        data = {
            "claimant_name": "John Doe",
            "claimant_email": "john@example.com",
            "claimant_phone": "555-123-4567",
            "documents": [self._create_test_file()],
        }
        response = self.client.post(self.base_url, data, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(mock_email_class.called)

    @patch(
        "duett_api.directory.views.upload_to_s3",
        return_value="https://example.com/test.pdf",
    )
    @patch("duett_api.directory.views.EmailMessage")
    @patch("duett_api.directory.views.settings")
    def test_claim_submitted_sends_admin_email_when_configured(
        self, mock_settings, mock_email_class, mock_upload
    ):
        mock_settings.DUETT_ADMIN_EMAIL = "admin@example.com"
        mock_settings.DEFAULT_FROM_EMAIL = "noreply@example.com"
        mock_settings.AWS_STORAGE_BUCKET_NAME = "test-bucket"
        mock_email_instance = MagicMock()
        mock_email_class.return_value = mock_email_instance
        data = {
            "claimant_name": "John Doe",
            "claimant_email": "john@example.com",
            "claimant_phone": "555-123-4567",
            "documents": [self._create_test_file()],
        }
        response = self.client.post(self.base_url, data, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class VendorFilterAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.account = AccountFactory()
        self.user = UserFactory(account=self.account)
        self.base_url = "/api/directory/vendors/"

    def test_filter_agency_name_by_legal_name(self):
        vendor1 = VendorDirectoryFactory(legal_name="ABC Home Care", dba="")
        VendorDirectoryFactory(legal_name="Other Company", dba="")

        response = self.client.get(f"{self.base_url}?limit=100&agency_name=Home Care")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], vendor1.id)

    def test_filter_agency_name_by_dba(self):
        vendor1 = VendorDirectoryFactory(legal_name="Legal Corp", dba="Friendly Care")
        VendorDirectoryFactory(legal_name="Other Corp", dba="Different Name")

        response = self.client.get(f"{self.base_url}?limit=100&agency_name=Friendly")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], vendor1.id)

    def test_filter_agency_name_case_insensitive(self):
        vendor = VendorDirectoryFactory(legal_name="ABC Home Care")

        response = self.client.get(
            f"{self.base_url}?limit=100&agency_name=abc home care"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], vendor.id)

    def test_filter_agency_name_empty_returns_all(self):
        VendorDirectoryFactory()
        VendorDirectoryFactory()

        response = self.client.get(f"{self.base_url}?limit=100&agency_name=")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_filter_agency_name_no_match_returns_empty(self):
        VendorDirectoryFactory(legal_name="ABC Corp", dba="DEF Services")

        response = self.client.get(
            f"{self.base_url}?limit=100&agency_name=XYZ Nonexistent"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)

    def test_filter_zip_code_returns_vendors_in_county(self):
        from duett_api.services.models import ZipCode

        county = CountyFactory(name="Test County")
        ZipCode.objects.create(zip="90210", county=county)

        vendor1 = VendorDirectoryFactory()
        VendorCountyServiceFactory(vendor=vendor1, county=county)

        vendor2 = VendorDirectoryFactory()
        other_county = CountyFactory(name="Other County")
        VendorCountyServiceFactory(vendor=vendor2, county=other_county)

        response = self.client.get(f"{self.base_url}?limit=100&zip_code=90210")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], vendor1.id)

    def test_filter_zip_code_not_found_returns_empty(self):
        VendorDirectoryFactory()

        response = self.client.get(f"{self.base_url}?limit=100&zip_code=00000")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)

    def test_filter_zip_code_empty_returns_all(self):
        VendorDirectoryFactory()
        VendorDirectoryFactory()

        response = self.client.get(f"{self.base_url}?limit=100&zip_code=")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_filter_services_single_service(self):
        service1 = ServiceTypeTestFactory(name="Home Care")
        service2 = ServiceTypeTestFactory(name="Nursing")
        county = CountyFactory()

        vendor1 = VendorDirectoryFactory()
        VendorCountyServiceFactory(vendor=vendor1, county=county, service=service1)

        vendor2 = VendorDirectoryFactory()
        VendorCountyServiceFactory(vendor=vendor2, county=county, service=service2)

        response = self.client.get(f"{self.base_url}?limit=100&services={service1.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], vendor1.id)

    def test_filter_services_multiple_services(self):
        service1 = ServiceTypeTestFactory(name="Home Care")
        service2 = ServiceTypeTestFactory(name="Nursing")
        service3 = ServiceTypeTestFactory(name="Therapy")
        county = CountyFactory()

        vendor1 = VendorDirectoryFactory()
        VendorCountyServiceFactory(vendor=vendor1, county=county, service=service1)

        vendor2 = VendorDirectoryFactory()
        VendorCountyServiceFactory(vendor=vendor2, county=county, service=service2)

        vendor3 = VendorDirectoryFactory()
        VendorCountyServiceFactory(vendor=vendor3, county=county, service=service3)

        response = self.client.get(
            f"{self.base_url}?limit=100&services={service1.id},{service2.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)
        result_ids = [r["id"] for r in response.data["results"]]
        self.assertIn(vendor1.id, result_ids)
        self.assertIn(vendor2.id, result_ids)

    def test_filter_services_empty_returns_all(self):
        VendorDirectoryFactory()
        VendorDirectoryFactory()

        response = self.client.get(f"{self.base_url}?limit=100&services=")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_filter_min_rating_filters_by_average(self):
        vendor1 = VendorDirectoryFactory()
        VendorReviewFactory(
            vendor=vendor1, stars=5, status=VendorReview.Status.APPROVED
        )
        VendorReviewFactory(
            vendor=vendor1, stars=4, status=VendorReview.Status.APPROVED
        )  # avg = 4.5

        vendor2 = VendorDirectoryFactory()
        VendorReviewFactory(
            vendor=vendor2, stars=2, status=VendorReview.Status.APPROVED
        )
        VendorReviewFactory(
            vendor=vendor2, stars=2, status=VendorReview.Status.APPROVED
        )  # avg = 2.0

        vendor3 = VendorDirectoryFactory()
        VendorReviewFactory(
            vendor=vendor3, stars=3, status=VendorReview.Status.APPROVED
        )
        VendorReviewFactory(
            vendor=vendor3, stars=4, status=VendorReview.Status.APPROVED
        )  # avg = 3.5

        response = self.client.get(f"{self.base_url}?limit=100&min_rating=3.5")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)
        result_ids = [r["id"] for r in response.data["results"]]
        self.assertIn(vendor1.id, result_ids)
        self.assertIn(vendor3.id, result_ids)
        self.assertNotIn(vendor2.id, result_ids)

    def test_filter_min_rating_excludes_unreviewed_vendors(self):
        vendor_with_reviews = VendorDirectoryFactory()
        VendorReviewFactory(
            vendor=vendor_with_reviews, stars=4, status=VendorReview.Status.APPROVED
        )

        VendorDirectoryFactory()  # no reviews

        response = self.client.get(f"{self.base_url}?limit=100&min_rating=3")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], vendor_with_reviews.id)

    def test_rating_and_review_count_only_includes_approved_reviews(self):
        vendor = VendorDirectoryFactory()
        VendorReviewFactory(vendor=vendor, stars=5, status=VendorReview.Status.APPROVED)
        VendorReviewFactory(vendor=vendor, stars=4, status=VendorReview.Status.APPROVED)
        VendorReviewFactory(vendor=vendor, stars=1, status=VendorReview.Status.PENDING)
        VendorReviewFactory(vendor=vendor, stars=2, status=VendorReview.Status.PENDING)

        response = self.client.get(f"{self.base_url}{vendor.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(response.data["rating"], 4.5)
        self.assertEqual(response.data["reviews"], 2)

    def test_filter_min_rating_empty_returns_all(self):
        VendorDirectoryFactory()
        VendorDirectoryFactory()

        response = self.client.get(f"{self.base_url}?limit=100&min_rating=")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_filter_languages_single_language(self):
        vendor1 = VendorDirectoryFactory(languages=["English", "Spanish"])
        VendorDirectoryFactory(languages=["French"])

        response = self.client.get(f"{self.base_url}?limit=100&languages=Spanish")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], vendor1.id)

    def test_filter_languages_multiple_languages(self):
        vendor1 = VendorDirectoryFactory(languages=["Spanish"])
        vendor2 = VendorDirectoryFactory(languages=["Vietnamese"])
        VendorDirectoryFactory(languages=["French"])

        response = self.client.get(
            f"{self.base_url}?limit=100&languages=Spanish,Vietnamese"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)
        result_ids = [r["id"] for r in response.data["results"]]
        self.assertIn(vendor1.id, result_ids)
        self.assertIn(vendor2.id, result_ids)

    def test_filter_languages_case_insensitive(self):
        vendor = VendorDirectoryFactory(languages=["Spanish"])

        response = self.client.get(f"{self.base_url}?limit=100&languages=spanish")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], vendor.id)

    def test_filter_languages_empty_returns_all(self):
        VendorDirectoryFactory()
        VendorDirectoryFactory()

        response = self.client.get(f"{self.base_url}?limit=100&languages=")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_filter_funding_sources_single_source(self):
        from duett_api.services.models import FundingSource

        source1 = FundingSource.objects.create(name="Medicare")
        source2 = FundingSource.objects.create(name="Medicaid")

        vendor1 = VendorDirectoryFactory()
        vendor1.funding_sources.add(source1)

        vendor2 = VendorDirectoryFactory()
        vendor2.funding_sources.add(source2)

        response = self.client.get(
            f"{self.base_url}?limit=100&funding_sources={source1.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], vendor1.id)

    def test_filter_funding_sources_multiple_sources(self):
        from duett_api.services.models import FundingSource

        source1 = FundingSource.objects.create(name="Medicare")
        source2 = FundingSource.objects.create(name="Medicaid")
        source3 = FundingSource.objects.create(name="Private Pay")

        vendor1 = VendorDirectoryFactory()
        vendor1.funding_sources.add(source1)

        vendor2 = VendorDirectoryFactory()
        vendor2.funding_sources.add(source2)

        vendor3 = VendorDirectoryFactory()
        vendor3.funding_sources.add(source3)

        response = self.client.get(
            f"{self.base_url}?limit=100&funding_sources={source1.id},{source2.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)
        result_ids = [r["id"] for r in response.data["results"]]
        self.assertIn(vendor1.id, result_ids)
        self.assertIn(vendor2.id, result_ids)

    def test_filter_funding_sources_empty_returns_all(self):
        VendorDirectoryFactory()
        VendorDirectoryFactory()

        response = self.client.get(f"{self.base_url}?limit=100&funding_sources=")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_filter_search_pattern_randomizes_order(self):
        for _ in range(5):
            VendorDirectoryFactory()

        response1 = self.client.get(
            f"{self.base_url}?limit=100&search_pattern=pattern_a"
        )
        response2 = self.client.get(
            f"{self.base_url}?limit=100&search_pattern=pattern_b"
        )

        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        self.assertEqual(response2.status_code, status.HTTP_200_OK)

        ids1 = [r["id"] for r in response1.data["results"]]
        ids2 = [r["id"] for r in response2.data["results"]]

        self.assertEqual(set(ids1), set(ids2))

    def test_filter_search_pattern_same_pattern_same_order(self):
        for _ in range(5):
            VendorDirectoryFactory()

        response1 = self.client.get(
            f"{self.base_url}?limit=100&search_pattern=consistent_pattern"
        )
        response2 = self.client.get(
            f"{self.base_url}?limit=100&search_pattern=consistent_pattern"
        )

        ids1 = [r["id"] for r in response1.data["results"]]
        ids2 = [r["id"] for r in response2.data["results"]]

        self.assertEqual(ids1, ids2)

    def test_filter_search_pattern_prioritizes_favorites_for_authenticated_user(self):
        self.client.force_authenticate(user=self.user)

        vendor2 = VendorDirectoryFactory()

        FavoriteVendor.objects.create(user=self.user, vendor=vendor2)

        response = self.client.get(
            f"{self.base_url}?limit=100&search_pattern=test_pattern"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        result_ids = [r["id"] for r in response.data["results"]]
        self.assertEqual(result_ids[0], vendor2.id)

    def test_filter_search_pattern_empty_returns_default_order(self):
        VendorDirectoryFactory(legal_name="AAA Vendor")
        VendorDirectoryFactory(legal_name="ZZZ Vendor")

        response = self.client.get(f"{self.base_url}?limit=100&search_pattern=")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_combined_filters(self):
        county = CountyFactory()
        service = ServiceTypeTestFactory(name="Home Care")

        vendor1 = VendorDirectoryFactory(
            legal_name="ABC Home Care", languages=["Spanish"]
        )
        VendorCountyServiceFactory(vendor=vendor1, county=county, service=service)
        VendorReviewFactory(
            vendor=vendor1, stars=5, status=VendorReview.Status.APPROVED
        )

        vendor2 = VendorDirectoryFactory(
            legal_name="XYZ Home Care", languages=["English"]
        )
        VendorCountyServiceFactory(vendor=vendor2, county=county, service=service)
        VendorReviewFactory(
            vendor=vendor2, stars=5, status=VendorReview.Status.APPROVED
        )

        vendor3 = VendorDirectoryFactory(
            legal_name="ABC Services", languages=["Spanish"]
        )
        VendorReviewFactory(
            vendor=vendor3, stars=5, status=VendorReview.Status.APPROVED
        )

        response = self.client.get(
            f"{self.base_url}?limit=100&agency_name=ABC&languages=Spanish&min_rating=4"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)
        result_ids = [r["id"] for r in response.data["results"]]
        self.assertIn(vendor1.id, result_ids)
        self.assertIn(vendor3.id, result_ids)
        self.assertNotIn(vendor2.id, result_ids)
