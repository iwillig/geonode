from django import forms

class TimeForm(forms.Form):
    presentation_strategy = forms.CharField(required=False)
    precision_value = forms.IntegerField(required=False)
    precision_step = forms.ChoiceField(required=False, choices=[
        ('years',)*2,
        ('months',)*2,
        ('days',)*2,
        ('hours',)*2,
        ('minutes',)*2,
        ('seconds',)*2
    ])

    def __init__(self, *args, **kwargs):
        # have to remove these from kwargs or Form gets mad
        time_names = kwargs.pop('time_names', None)
        text_names = kwargs.pop('text_names', None)
        year_names = kwargs.pop('year_names', None)
        super(TimeForm, self).__init__(*args, **kwargs)
        self._build_choice('time_attribute', time_names)
        self._build_choice('end_time_attribute', time_names)
        self._build_choice('text_attribute', text_names)
        self._build_choice('end_text_attribute', text_names)
        if text_names:
            self.fields['text_attribute_format'] = forms.CharField(required=False)
        self._build_choice('year_attribute', year_names)
        self._build_choice('end_year_attribute', year_names)

    def _build_choice(self, att, names):
        if names:
            names.sort()
            choices = [('', '<None>')] + [(a, a) for a in names]
            self.fields[att] = forms.ChoiceField(
                choices=choices, required=False)
    # @todo implement clean


class SRSForm(forms.Form):
    srs = forms.CharField(required=True)
