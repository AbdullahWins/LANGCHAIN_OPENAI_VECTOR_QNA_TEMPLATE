// Controllers/historyController.js

const { ObjectId } = require("mongodb");
const { chatHistoriesCollection } = require("../../config/database/db");
const { Timekoto } = require("timekoto");

//get all history
const getAllHistories = async (req, res) => {
  try {
    //validate user authority from middleware
    const user = req.user;
    if (user?.role !== "admin") {
      return res.status(401).send({
        message: "This user does not have access to perform this operation!",
      });
    } else {
      console.log("user is accessing the API!");
    }
    //perform query on database
    const query = {};
    const cursor = chatHistoriesCollection.find(query);
    const histories = await cursor.toArray();
    if (histories?.length === 0) {
      return res.send([]);
    }
    console.log(`found ${histories.length} histories`);
    res.send(histories);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Server Error" });
  }
};

//get single history
const getOneHistory = async (req, res) => {
  try {
    const historyId = req?.params?.id;
    //object id validation
    if (!ObjectId.isValid(historyId)) {
      console.log("Invalid ObjectId:", historyId);
      return res.status(400).send({ message: "Invalid ObjectId" });
    }

    //perform query on database
    const history = await chatHistoriesCollection.findOne({
      _id: new ObjectId(historyId),
    });

    //validate user authority from middleware
    const user = req.user;
    if (user?.role !== "admin") {
      if (user?._id.toString() !== history?.userId) {
        console.log(user?._id.toString(), history?.userId);
        return res.status(401).send({
          message: "This user does not have access to perform this operation!",
        });
      } else {
        console.log("user is accessing the API!");
      }
    }

    if (!history) {
      res.status(404).send({ message: "history not found" });
    } else {
      res.send(history);
      console.log(history);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Server error" });
  }
};

//get history By user
const getHistoriesByUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    //object id validation
    if (!ObjectId.isValid(userId)) {
      console.log("Invalid ObjectId:", userId);
      return res.status(400).send({ message: "Invalid ObjectId" });
    }

    //to perform multiple filters at once
    // const filter = [{ userId: userId }];
    // const response = chatHistoriesCollection.find({
    //   filter,
    // });

    //to perform single filter
    const filter = { userId: userId };

    //validate user authority from middleware
    const user = req.user;
    if (user?.role !== "admin") {
      if (user?._id.toString() !== userId) {
        console.log(user?._id.toString(), userId);
        return res.status(401).send({
          message: "This user does not have access to perform this operation!",
        });
      } else {
        console.log("user is accessing the API!");
      }
    }

    //perform query on database
    const response = chatHistoriesCollection.find(filter);
    const historyDetails = await response.toArray();
    if (!historyDetails) {
      res.status(404).send({ message: "history not found on this type" });
    } else {
      console.log(historyDetails);
      res.send(historyDetails);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Server Error" });
  }
};

//get latest message history by user
const getLastHistoriesByUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    //object id validation
    if (!ObjectId.isValid(userId)) {
      console.log("Invalid ObjectId:", userId);
      return res.status(400).send({ message: "Invalid ObjectId" });
    }

    //to perform single filter
    const filter = { userId: userId };

    //validate user authority from middleware
    const user = req.user;
    if (user?.role !== "admin") {
      if (user?._id.toString() !== userId) {
        console.log(user?._id.toString(), userId);
        return res.status(401).send({
          message: "This user does not have access to perform this operation!",
        });
      } else {
        console.log("user is accessing the API!");
      }
    }

    //perform query on database
    const response = chatHistoriesCollection.aggregate([
      // Match documents based on the filter
      { $match: filter },
      // Sort by sentAt in descending order
      { $sort: { sentAt: -1 } },
      {
        $group: {
          _id: { moduleName: "$moduleName", historyId: "$historyId" },
          // Get the first document in each group (latest based on sorting)
          latestMessage: { $first: "$$ROOT" },
        },
      },
      // Replace the root with the latestMessage document
      { $replaceRoot: { newRoot: "$latestMessage" } },
    ]);

    const historyDetails = await response.toArray();
    if (!historyDetails) {
      res.status(404).send({ message: "history not found on this type" });
    }
    console.log(historyDetails);
    res.send(historyDetails);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Server Error" });
  }
};

//add new history
const addOneHistory = async (req, res) => {
  try {
    const { userId, moduleName, historyId, message, sentBy } = JSON.parse(
      req?.body?.data
    );
    if (!userId || !moduleName || !historyId || !message || !sentBy) {
      res.status(400).send({ message: "Missing required fields" });
    }
    const newHistory = {
      userId,
      moduleName,
      historyId,
      message,
      sentBy,
      sentAt: Timekoto(),
    };
    //validate user authority from middleware
    const user = req.user;
    if (user?.role !== "admin") {
      if (user?._id.toString() !== userId) {
        console.log(user?._id.toString(), userId);
        return res.status(401).send({
          message: "This user does not have access to perform this operation!",
        });
      } else {
        console.log("user is accessing the API!");
      }
    }
    //add new history
    const result = await chatHistoriesCollection.insertOne(newHistory);
    if (result.insertedCount === 0) {
      console.log("Failed to add history");
      return res.status(500).send({ message: "Failed to add history" });
    }
    console.log("Added a new history", newHistory);
    return res.status(201).send(newHistory);
  } catch (error) {
    console.error(`Error: ${error}`);
    return res
      .status(500)
      .send({ message: "Failed to add a message to the history!" });
  }
};

//delete one history
const deleteOneHistoryByHistoryId = async (req, res) => {
  try {
    const { userId, moduleName, historyId } = JSON.parse(req?.body?.data);
    console.log(userId);

    //validate user authority from middleware
    const user = req.user;
    if (user?.role !== "admin") {
      if (user?._id.toString() !== userId) {
        console.log(user?._id.toString(), userId);
        return res.status(401).send({
          message: "This user does not have access to perform this operation!",
        });
      } else {
        console.log("user is accessing the API!");
      }
    }

    //perform filter on database
    // const filter = { historyId: parseInt(historyId)};

    //to perform multiple filters at once
    const filter = {
      userId: userId,
      moduleName: moduleName,
      historyId: parseInt(historyId),
    };

    const result = await chatHistoriesCollection.deleteMany(filter);
    console.log(result);
    if (result?.deletedCount === 0) {
      console.log("no history found with this id:", historyId);
      res.send({ message: "no history found with this id!" });
    } else {
      console.log("history deleted with Id:", historyId);
      res.status(200).send({
        message: `history deleted including ${result?.deletedCount} messages!`,
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Failed to delete history" });
  }
};

module.exports = {
  getAllHistories,
  getOneHistory,
  getHistoriesByUser,
  getLastHistoriesByUser,
  addOneHistory,
  deleteOneHistoryByHistoryId,
};
