from django.contrib import admin

import geonode.groups.models


class GroupMemberInline(admin.TabularInline):
    model = geonode.groups.models.GroupMember


admin.site.register(geonode.groups.models.Group,
    inlines = [
        GroupMemberInline
    ]
)
