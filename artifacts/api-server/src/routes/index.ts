import { Router, type IRouter } from "express";
import healthRouter from "./health";
import gridlensRouter from "./gridlens";

const router: IRouter = Router();

router.use(healthRouter);
router.use(gridlensRouter);

export default router;
