const TABS = [
  { id: "dashboard",   label: "Dashboard" },
  { id: "overview",     label: "Overview" },
  { id: "wbs",         label: "WBS" },
  { id: "pricing",     label: "Pricing Matrix" },
  { id: "people",      label: "People" },
  { id: "schedule",    label: "Schedule" },
  { id: "deliverables",      label: "Deliverables" },
  { id: "drawings",          label: "Drawing List" },
  { id: "relevant-projects", label: "Relevant Projects" },
];

interface TabNavProps {
  activeTab: string;
  onChange: (tab: string) => void;
  presence?: Record<string, string[]>;
  counts?: Record<string, number>;
}

export default function TabNav({ activeTab, onChange, presence = {}, counts }: TabNavProps) {
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
          {counts && counts[tab.id] != null && counts[tab.id] > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-full
              bg-wsp-bg-soft text-wsp-muted border border-wsp-border leading-none">
              {counts[tab.id]}
            </span>
          )}
          {tab.id !== "dashboard" && presence[tab.id]?.map(name => (
            <span
              key={name}
              title={name}
              className="w-4 h-4 rounded-full bg-green-500 text-white text-[9px]
                         flex items-center justify-center font-bold ring-2 ring-white"
            >
              {name[0].toUpperCase()}
            </span>
          ))}
        </button>
      ))}
    </div>
  );
}
