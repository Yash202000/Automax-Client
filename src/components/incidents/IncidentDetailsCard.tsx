import { Card } from "@/components/ui";

const IncidentDetailsCard = ({ incident }: { incident: any }) => {
  return (
    <Card className="p-6 mb-6">
      {/* Top Section */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <p className="text-xs text-gray-500">Incident ID</p>
          <h2 className="text-xl font-bold text-gray-900">
            #{incident.incident_number}
          </h2>
        </div>

        <span className="inline-flex w-fit items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
          {incident.status || "Open"}
        </span>
      </div>

      {/* Title */}
      <h3 className="mt-4 text-base font-semibold text-gray-800">
        {incident.title}
      </h3>

      {/* Description */}
      {incident.description && (
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">
          {incident.description}
        </p>
      )}
    </Card>
  );
};

export default IncidentDetailsCard;
