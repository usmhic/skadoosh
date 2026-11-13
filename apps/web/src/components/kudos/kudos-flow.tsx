import { cn } from "@skaddosh/ui/lib/utils";
import { KudosMark } from "./kudos-ui";

/** A small diagram of the Kudos loop, shown in the hero and on the wallet page. */
export function KudosFlow() {
  const steps = [
    { temp: "hot" as const, title: "Give Hot Kudos", body: "Support any piece or project. Kudos go straight to its creator." },
    { temp: "cold" as const, title: "Back with Cold Kudos", body: "Commit Kudos to a project in progress. The earlier you back, the more your backing counts." },
    { temp: "cold" as const, title: "Released as it ships", body: "The creator receives your Kudos milestone by milestone. If the project is cancelled, they come back to you." },
    { temp: "hot" as const, title: "Returns for believers", body: "Successful projects share what they earn with their backers, up to a cap." },
  ];
  return (
    <ol className="relative grid gap-3">
      {steps.map((step, index) => (
        <li
          key={step.title}
          className={cn(
            "flex gap-4 rounded-2xl border p-4",
            step.temp === "hot" ? "border-hot/20 bg-hot-soft/60" : "border-cold/20 bg-cold-soft/60",
          )}
        >
          <div className="flex flex-col items-center gap-1">
            <KudosMark temp={step.temp} size="md" />
            <span className="font-mono text-[0.6rem] text-muted-foreground">0{index + 1}</span>
          </div>
          <div>
            <p className="text-sm font-semibold">{step.title}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
