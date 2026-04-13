from rest_framework import serializers
import datetime

class ActivitySerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    res_model = serializers.CharField(default="project.task")
    res_id = serializers.IntegerField()
    activity_type_id = serializers.JSONField()
    summary = serializers.CharField(required=False, allow_blank=True)
    note = serializers.CharField(required=False, allow_blank=True)
    date_deadline = serializers.DateField(required=False)
    user_id = serializers.JSONField(required=False)
    state = serializers.CharField(read_only=True, required=False)
    create_date = serializers.DateTimeField(read_only=True, required=False)

    def to_odoo(self, validated_data):
        payload = dict(validated_data)
        
        for m2o_field in ["activity_type_id", "user_id"]:
            if m2o_field in payload:
                val = payload[m2o_field]
                if isinstance(val, list) and val:
                    payload[m2o_field] = int(val[0])
                elif val is not None and val is not False and val != "":
                    try:
                        payload[m2o_field] = int(val)
                    except (ValueError, TypeError):
                        payload[m2o_field] = False
                else:
                    payload[m2o_field] = False
                    
        for date_field in ["date_deadline"]:
            if date_field in payload:
                val = payload[date_field]
                if isinstance(val, datetime.date) or isinstance(val, datetime.datetime):
                    payload[date_field] = val.strftime("%Y-%m-%d")

        return payload

class TrackingValueSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    field = serializers.CharField(read_only=True)
    field_desc = serializers.CharField(read_only=True)
    old_value = serializers.CharField(read_only=True, required=False, allow_null=True)
    new_value = serializers.CharField(read_only=True, required=False, allow_null=True)

class MessageSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    body = serializers.CharField(required=False, allow_blank=True)
    date = serializers.DateTimeField(read_only=True, required=False)
    author_id = serializers.JSONField(read_only=True, required=False)
    tracking_values = TrackingValueSerializer(many=True, read_only=True, required=False)
