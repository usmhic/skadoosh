import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@skaddosh/api";

export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type DiscoverItem = RouterOutputs["discover"]["feed"]["items"][number];
export type PublicProject = NonNullable<RouterOutputs["projects"]["publicById"]>;
export type ProjectCardData = RouterOutputs["projects"]["list"][number];
