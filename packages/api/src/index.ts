import { router } from "./trpc";
import { worksRouter }    from "./routers/works";
import { creatorsRouter } from "./routers/creators";
import { usersRouter }    from "./routers/users";
import { portfoliosRouter } from "./routers/portfolios";
import { projectsRouter } from "./routers/projects";
import { galleryRouter }  from "./routers/gallery";
import { accessRouter }  from "./routers/access";
import { savedRouter }   from "./routers/saved";

export const appRouter = router({
  works:      worksRouter,
  creators:   creatorsRouter,
  users:      usersRouter,
  portfolios: portfoliosRouter,
  projects:   projectsRouter,
  gallery:    galleryRouter,
  access:     accessRouter,
  saved:      savedRouter,
});

export type AppRouter = typeof appRouter;
export * from "./trpc";
