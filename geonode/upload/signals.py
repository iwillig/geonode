from django.dispatch import Signal

upload_complete = Signal(providing_args=['layer'])
