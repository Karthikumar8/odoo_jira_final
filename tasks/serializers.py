import datetime
from rest_framework import serializers

class TaskSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(max_length=512)
    active = serializers.BooleanField(default=True, required=False)
    color = serializers.IntegerField(default=0, required=False)
    project_id = serializers.JSONField(required=False, allow_null=True)
    stage_id = serializers.JSONField(required=False, allow_null=True)
    state = serializers.CharField(required=False, allow_blank=True)
    user_ids = serializers.JSONField(required=False, default=list)
    partner_id = serializers.JSONField(required=False, allow_null=True)
    priority = serializers.CharField(required=False, default="0")
    date_deadline = serializers.DateTimeField(required=False, allow_null=True)
    planned_date_begin = serializers.DateTimeField(required=False, allow_null=True)
    date_end = serializers.DateTimeField(required=False, allow_null=True)
    allocated_hours = serializers.FloatField(required=False, default=0.0)
    effective_hours = serializers.FloatField(read_only=True)
    remaining_hours = serializers.FloatField(read_only=True)
    overtime = serializers.FloatField(read_only=True)
    progress = serializers.FloatField(read_only=True)
    description = serializers.CharField(required=False, allow_blank=True)
    tag_ids = serializers.JSONField(required=False, default=list)
    parent_id = serializers.JSONField(required=False, allow_null=True)
    child_ids = serializers.ListField(child=serializers.IntegerField(), read_only=True, required=False)
    depend_on_ids = serializers.JSONField(required=False, default=list)
    dependent_ids = serializers.ListField(child=serializers.IntegerField(), read_only=True, required=False)
    milestone_id = serializers.JSONField(required=False, allow_null=True)
    recurring_task = serializers.BooleanField(required=False, default=False)
    recurrence_id = serializers.JSONField(required=False, allow_null=True)
    sale_line_id = serializers.JSONField(required=False, allow_null=True)
    display_in_project = serializers.BooleanField(required=False, default=True)
    rating_last_value = serializers.FloatField(read_only=True, required=False)
    access_token = serializers.CharField(read_only=True, required=False)
    sequence = serializers.IntegerField(required=False, default=10)

    def to_odoo(self, validated_data):
        payload = dict(validated_data)
        
        for m2m_field in ["user_ids", "tag_ids", "depend_on_ids"]:
            if m2m_field in payload:
                payload[m2m_field] = [(6, 0, payload[m2m_field])]
                
        for m2o_field in ["project_id", "stage_id", "partner_id", "parent_id", "milestone_id", "recurrence_id", "sale_line_id"]:
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
                    
        for date_field in ["date_deadline", "planned_date_begin", "date_end"]:
            if date_field in payload:
                val = payload[date_field]
                if isinstance(val, datetime.datetime):
                    payload[date_field] = val.strftime("%Y-%m-%d %H:%M:%S")
                elif isinstance(val, datetime.date):
                    payload[date_field] = val.strftime("%Y-%m-%d %H:%M:%S")

        for field in ["description", "name"]:
            if payload.get(field) is False:
                payload[field] = ""

        return payload
    def to_representation(self, instance):
        ret = super().to_representation(instance)
        for field in ["description", "name", "state"]:
            if ret.get(field) is False:
                ret[field] = ""
        return ret
