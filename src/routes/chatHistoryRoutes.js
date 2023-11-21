const router = require("express").Router();

const {
  getAllHistories,
  getOneHistory,
  getHistoriesByUser,
  getLastHistoriesByUser,
  addOneHistory,
  deleteOneHistoryByHistoryId,
} = require("../controllers/chatHistoryController");
const { authorizeUserOrAdmin } = require("../middlewares/AuthorizeUserOrAdmin");

router.get("/histories/all", authorizeUserOrAdmin, getAllHistories);
router.get("/histories/find/:id", authorizeUserOrAdmin, getOneHistory);
router.get(
  "/histories/users/:userId",
  authorizeUserOrAdmin,
  getHistoriesByUser
);
router.get(
  "/histories/last/:userId",
  authorizeUserOrAdmin,
  getLastHistoriesByUser
);
router.post("/histories/add", authorizeUserOrAdmin, addOneHistory);
router.delete(
  "/histories/delete",
  authorizeUserOrAdmin,
  deleteOneHistoryByHistoryId
);

module.exports = router;
