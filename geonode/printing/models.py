from django.db import models
from django.utils.translation import ugettext as _

class PrintTemplate(models.Model):
    """A template suitable for interpolation that can be printed with a map"""

    title = models.CharField(_('Title'), max_length=30)
    contents = models.TextField(_('Contents'))
    url = models.URLField(_('Url'), null=True, blank=True)

    def __unicode__(self):
        return self.title

