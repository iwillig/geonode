import datetime
import itertools

from django.conf import settings
from django.db import models
from django.template.loader import render_to_string
from django.utils.hashcompat import sha_constructor
from django.utils.translation import ugettext_lazy as _

from django.contrib.auth.models import User

from taggit.managers import TaggableManager


class Group(models.Model):
    
    title = models.CharField(max_length=50)
    slug = models.SlugField(unique=True)
    logo = models.FileField(upload_to="people_peoplegroup")
    description = models.TextField()
    keywords = TaggableManager(_('keywords'), help_text=_("A space or comma-separated list of keywords"), blank=True)
    access = models.CharField(max_length=15, choices=[
        ("public", _("Public")),
        ("public-invite", _("Public (invite-only)")),
        ("private", _("Private")),
    ])
    
    def member_queryset(self):
        return self.groupmember_set.all()
    
    def user_is_member(self, user):
        if not user.is_authenticated():
            return False
        return user.id in self.member_queryset().values_list("user", flat=True)
    
    def user_is_role(self, user, role):
        return user.is_authenticated() and self.member_queryset().filter(user=user, role=role).exists()
    
    def can_view(self, user):
        if self.access == "private":
            return user.is_authenticated() and self.user_is_member(user)
        else:
            return True
    
    def can_invite(self, user):
        if not user.is_authenticated():
            return False
        return self.user_is_role(user, "manager")
    
    def join(self, user, **kwargs):
        GroupMember(group=self, user=user, **kwargs).save()
    
    def invite(self, user, from_user, role="member", send=True):
        params = dict(role=role, from_user=from_user)
        if isinstance(user, User):
            params["user"] = user
            params["email"] = user.email
        else:
            params["email"] = user
        bits = [
            settings.SECRET_KEY,
            params["email"],
            str(datetime.datetime.now()),
            settings.SECRET_KEY
        ]
        params["token"] = sha_constructor("".join(bits)).hexdigest()
        invitation = self.invitations.create(**params)
        if send:
            invitation.send(from_user)
        return invitation

    @models.permalink
    def get_absolute_url(self):
        return ('group_detail', (), { 'slug': self.slug })


class GroupMember(models.Model):
    
    group = models.ForeignKey(Group)
    user = models.ForeignKey(User)
    role = models.CharField(max_length=10, choices=[
        ("manager", _("Manager")),
        ("member", _("Member")),
    ])
    joined = models.DateTimeField(default=datetime.datetime.now)


class GroupInvitation(models.Model):
    
    group = models.ForeignKey(Group, related_name="invitations")
    token = models.CharField(max_length=40)
    email = models.EmailField()
    user = models.ForeignKey(User, null=True, related_name="pg_invitations_received")
    from_user = models.ForeignKey(User, related_name="pg_invitations_sent")
    role = models.CharField(max_length=10, choices=[
        ("manager", _("Manager")),
        ("member", _("Member")),
    ])
    state = models.CharField(
        max_length = 10,
        choices = (
            ("sent", _("Sent")),
            ("accepted", _("Accepted")),
            ("declined", _("Declined")),
        ),
        default = "sent",
    )
    created = models.DateTimeField(default=datetime.datetime.now)
    
    class Meta:
        unique_together = [("group", "email")]
    
    def send(self, from_user):
        ctx = {
            "invite": self,
            "group": self.group,
            "from_user": from_user,
        }
        subject = render_to_string("groups/email/invite_user_subject.txt", ctx)
        message = render_to_string("groups/email/invite_user.txt", ctx)
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [self.email])
    
    def accept(self, user):
        if not user.is_authenticated():
            raise ValueError("You must log in to accept invitations")
        if not user.email == self.email:
            raise ValueError("You can't accept an invitation that wasn't for you")
        self.group.join(user, role=self.role)
        self.state = "accepted"
        self.user = user
        self.save()
    
    def decline(self, user):
        if not user.is_authenticated():
            raise ValueError("You must log in to decline invitations")
        if not user.email == self.email:
            raise ValueError("You can't decline an invitation that wasn't for you")
        self.state = "declined"
        self.save()
