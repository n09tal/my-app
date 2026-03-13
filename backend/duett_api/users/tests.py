from rest_framework.test import APITestCase
from rest_framework import status
from duett_api.users.models import User


class DirectoryUserRegistrationTests(APITestCase):
    def test_register_user_with_profile_returns_correct_data(self):
        data = {
            "email": "test@example.com",
            "password": "securepass123",
            "user_profile": {
                "first_name": "John",
                "last_name": "Doe",
            },
        }
        response = self.client.post(
            "/api/directory/users/register/", data, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["email"], "test@example.com")
        self.assertEqual(response.data["user_profile"]["first_name"], "John")
        self.assertEqual(response.data["user_profile"]["last_name"], "Doe")

        user = User.objects.get(email="test@example.com")
        self.assertTrue(user.check_password("securepass123"))
        self.assertEqual(user.userprofile.first_name, "John")

    def test_register_user_without_profile(self):
        data = {
            "email": "minimal@example.com",
            "password": "securepass123",
        }
        response = self.client.post(
            "/api/directory/users/register/", data, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email="minimal@example.com").exists())

    def test_register_duplicate_email_fails(self):
        User.objects.create_user(email="existing@example.com", password="pass123")

        data = {
            "email": "existing@example.com",
            "password": "newpass123",
        }
        response = self.client.post(
            "/api/directory/users/register/", data, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
