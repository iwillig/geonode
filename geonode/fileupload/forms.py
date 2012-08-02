from django import forms
from geonode.fileupload.models import Picture

class PictureForm(forms.ModelForm):
    class Meta:
        model = Picture
