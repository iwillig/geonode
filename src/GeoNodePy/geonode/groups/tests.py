from django.conf import settings
from django.test import TestCase
from django.test.client import Client
from django.contrib.auth.models import User, AnonymousUser

import geonode.groups.models
import geonode.groups.views

from mock import Mock, patch

class SmokeTest(TestCase):
    "Basic checks to make sure pages load, etc."

    fixtures = ["test_data"]

    def test_public_pages_render(self):
        "Verify pages that do not require login load without internal error"

        c = Client()

        response = c.get("/groups/")
        self.assertEqual(200, response.status_code)

        response = c.get("/groups/group/bar/")
        self.assertEqual(200, response.status_code)

        response = c.get("/groups/group/bar/members/")
        self.assertEqual(200, response.status_code)

        # TODO: test invite: url("/groups/group/bar/invite/(?P<token>[\w]{40})/")

        # 302 for auth failure since we redirect to login page
        response = c.get("/groups/create/")
        self.assertEqual(302, response.status_code)

        response = c.get("/groups/group/bar/update/")
        self.assertEqual(302, response.status_code)

        response = c.get("/groups/group/bar/maps/")
        self.assertEqual(302, response.status_code)

        response = c.get("/groups/group/bar/layers/")
        self.assertEqual(302, response.status_code)

        response = c.get("/groups/group/bar/remove/")
        self.assertEqual(302, response.status_code)

        # 405 - json endpoint, doesn't support GET
        response = c.get("/groups/group/bar/invite/")
        self.assertEqual(405, response.status_code)


    def test_protected_pages_render(self):
        "Verify pages that require login load without internal error"

        c = Client()
        self.assertTrue(c.login(username="admin", password="admin"))

        response = c.get("/groups/")
        self.assertEqual(200, response.status_code)

        response = c.get("/groups/group/bar/")
        self.assertEqual(200, response.status_code)

        response = c.get("/groups/group/bar/members/")
        self.assertEqual(200, response.status_code)

        # TODO: test invite: url("/groups/group/bar/invite/(?P<token>[\w]{40})/")

        response = c.get("/groups/create/")
        self.assertEqual(200, response.status_code)

        response = c.get("/groups/group/bar/update/")
        self.assertEqual(200, response.status_code)

        response = c.get("/groups/group/bar/maps/")
        self.assertEqual(200, response.status_code)

        response = c.get("/groups/group/bar/layers/")
        self.assertEqual(200, response.status_code)

        response = c.get("/groups/group/bar/remove/")
        self.assertEqual(200, response.status_code)

        # 405 - json endpoint, doesn't support GET
        response = c.get("/groups/group/bar/invite/")
        self.assertEqual(405, response.status_code)
 

class MembershipTest(TestCase):
    "Tests membership logic in the geonode.groups models"

    fixtures = ["test_data"]

    def test_group_is_member(self):
        "Test geonode.groups.models.Group::is_member"

        anon = AnonymousUser()
        normal = User.objects.get(username="norman")
        group = geonode.groups.models.Group.objects.get(slug="bar")

        self.assert_(not group.user_is_member(anon))
        self.assert_(not group.user_is_member(normal))

    def test_group_add_member(self):
        "Test geonode.groups.models.Group::is_member when adding a user to a group"

        anon = AnonymousUser()
        normal = User.objects.get(username="norman")
        group = geonode.groups.models.Group.objects.get(slug="bar")
        group.join(normal)
        self.assert_(group.user_is_member(normal))
        self.assertRaises(ValueError, lambda: group.join(anon))

class Membe
