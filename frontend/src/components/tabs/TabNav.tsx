const TABS = [
  { id: "overview", label: "Overview" },
  { id: "wbs", label: "WBS" },
  { id: "pricing", label: "Pricing Matrix" },
  { id: "people", label: "People" },
  { id: "schedule", label: "Schedule" },
  { id: "deliverables", label: "Deliverables" },
  { id: "drawings", label: "Drawing List" },
];

interface TabNavProps {
  activeTab: string;
  onChange: (tab: string) => void;
  presence?: Record<string, string[]>;
}

export default function TabNav({ activeTab, onChange, presence = {} }: TabNavProps) {
  return (
    <div className="border-b flex gap-1 px-6 bg-white overflow-x-auto">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === tab.id
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          {tab.label}
          {presence[tab.id]?.map(name => (
            <span
              key={name}
              title={name}
              className="w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center font-bold"
            >
              {name[0].toUpperCase()}
            </span>
          ))}
        </button>
      ))}
    </div>
  );
}
