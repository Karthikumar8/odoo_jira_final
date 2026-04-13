from rest_framework import serializers

class ProjectUpdateSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(max_length=512, default="Status Update")
    date = serializers.DateField(required=False)
    project_id = serializers.JSONField()
    user_id = serializers.JSONField(required=False)
    status = serializers.ChoiceField(choices=["on_track", "at_risk", "off_track", "on_hold"], default="on_track")
    progress = serializers.FloatField(required=False, default=0.0)
    description = serializers.CharField(required=False, allow_blank=True)
    
    allocated_time = serializers.FloatField(read_only=True, required=False)
    task_count = serializers.IntegerField(read_only=True, required=False)
    closed_task_count = serializers.IntegerField(read_only=True, required=False)
    timesheet_time = serializers.FloatField(read_only=True, required=False)

    def to_odoo(self, validated_data):
        payload = dict(validated_data)
        
        for m2o_field in ["project_id", "user_id"]:
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
                    
        import datetime
        for date_field in ["date"]:
            if date_field in payload:
                val = payload[date_field]
                if isinstance(val, datetime.date) or isinstance(val, datetime.datetime):
                    payload[date_field] = val.strftime("%Y-%m-%d")

        if payload.get("status") not in ["on_track", "at_risk", "off_track", "on_hold"]:
            if "status" in payload:
                del payload["status"]

        return payload
