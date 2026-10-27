import { Router } from "express";
import { getCities, getEvent, search } from "../controllers/eventController";

const router = Router();

router.get("/cities", getCities);
router.get("/events/search", search);
router.get("/events/:id", getEvent);

export default router;
