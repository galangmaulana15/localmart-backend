import { getMyStoreService } from "../services/store.service.js";

export const getMyStore = async (req, res) => {
  try {
    const store = await getMyStoreService(req.user.id);

    res.status(200).json({
      success: true,
      data: store
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};