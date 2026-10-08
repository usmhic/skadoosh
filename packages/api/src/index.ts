import { router } from "./trpc";
import { worksRouter }    from "./routers/works";
import { creatorsRouter } from "./routers/creators";
import { usersRouter }    from "./routers/users";
import { portfoliosRouter } from "./routers/portfolios";
import { projectsRouter } from "./routers/projects";
import { galleryRouter }  from "./routers/gallery";
import { accessRouter }  from "./routers/access";
import { savedRouter }   from "./routers/saved";
import { kudosRouter }   from "./routers/kudos";
import { discoverRouter } from "./routers/discover";
import { identityRouter } from "./routers/identity";
import { chainRouter } from "./routers/chain";
import { licensesRouter } from "./routers/licenses";
import { contributorsRouter } from "./routers/contributors";

export const appRouter = router({
  works:      worksRouter,
  creators:   creatorsRouter,
  users:      usersRouter,
  portfolios: portfoliosRouter,
  projects:   projectsRouter,
  gallery:    galleryRouter,
  access:     accessRouter,
  saved:      savedRouter,
  kudos:      kudosRouter,
  discover:   discoverRouter,
  identity:   identityRouter,
  chain:      chainRouter,
  licenses:   licensesRouter,
  contributors: contributorsRouter,
});

export type AppRouter = typeof appRouter;
export * from "./trpc";
export type { DiscoverItem, DiscoverMode } from "./routers/discover";
export { reconcileChainOps } from "./lib/chain-ops";
export { applyDecision, parseVeriffDecision, verifyVeriffSignature } from "./lib/identity";
export { secureCompare } from "./lib/secure-compare";
