from rest_framework import serializers

class TimesheetSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(max_length=512)
    date = serializers.DateField(required=False)
    project_id = serializers.JSONField(required=False, allow_null=True)
    task_id = serializers.JSONField(required=False, allow_null=True)
    employee_id = serializers.JSONField(required=False, allow_null=True)
    user_id = serializers.JSONField(required=False, allow_null=True)
    unit_amount = serializers.FloatField(required=True)
    amount = serializers.FloatField(read_only=True, required=False)

    def to_odoo(self, validated_data):
        payload = dict(validated_data)
        
        for m2o_field in ["project_id", "task_id", "employee_id", "user_id"]:
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
