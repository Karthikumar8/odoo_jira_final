from rest_framework import serializers

class ProjectSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(max_length=256)
    description = serializers.CharField(allow_blank=True, required=False)
    partner_id = serializers.JSONField(required=False, allow_null=True)
    user_id = serializers.JSONField(required=False, allow_null=True)
    tag_ids = serializers.JSONField(required=False, default=list)
    date_start = serializers.DateField(allow_null=True, required=False)
    date = serializers.DateField(allow_null=True, required=False)
    allocated_hours = serializers.FloatField(required=False, default=0.0)
    effective_hours = serializers.FloatField(read_only=True)
    privacy_visibility = serializers.ChoiceField(
        choices=["followers", "employees", "invited_internal", "portal"], 
        required=False, default="employees"
    )
    allow_timesheets = serializers.BooleanField(required=False, default=False)
    allow_milestones = serializers.BooleanField(required=False, default=False)
    allow_task_dependencies = serializers.BooleanField(required=False, default=False)
    allow_recurring_tasks = serializers.BooleanField(required=False, default=False)
    stage_id = serializers.JSONField(required=False, allow_null=True)
    task_count = serializers.IntegerField(read_only=True)
    color = serializers.IntegerField(required=False, default=0)
    company_id = serializers.JSONField(required=False, allow_null=True)
    active = serializers.BooleanField(required=False, default=True)

    def to_odoo(self, validated_data):
        payload = dict(validated_data)
        if "tag_ids" in payload:
            payload["tag_ids"] = [(6, 0, payload["tag_ids"])]
        
        for m2o_field in ["partner_id", "user_id", "stage_id", "company_id"]:
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
        return payload
