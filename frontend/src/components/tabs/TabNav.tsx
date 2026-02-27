const TABS = [
  { id: "overview",     label: "Overview" },
  { id: "wbs",         label: "WBS" },
  { id: "pricing",     label: "Pricing Matrix" },
  { id: "people",      label: "People" },
  { id: "schedule",    label: "Schedule" },
  { id: "deliverables",label: "Deliverables" },
  { id: "drawings",    label: "Drawing List" },
];

interface TabNavProps {
  activeTab: string;
  onChange: (tab: string) => void;
  presence?: Record<string, string[]>;
}

export default function TabNav({ activeTab, onChange, presence = {} }: TabNavProps) {
  return (
    <div className="bg-white border-b border-wsp-border flex gap-0 px-6 overflow-x-auto">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-1.5 px-5 py-3.5 text-sm font-display font-medium
            tracking-wide transition-colors whitespace-nowrap
            ${activeTab === tab.id ? "wsp-tab-active" : "wsp-tab-inactive"}`}
        >
          {tab.label}
          {presence[tab.id]?.map(name => (
            <span
              key={name}
              title={name}
              className="w-5 h-5 rounded-full bg-wsp-red text-white text-[10px]
                         flex items-center justify-center font-bold"
            >
              {name[0].toUpperCase()}
            </span>
          ))}
        </button>
      ))}
    </div>
  );
}
