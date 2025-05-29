import axios from "axios";

// Constants
import { ServiceUrl } from "../constants/generalConstants";

// Upload Media
async function uploadMedia(mediaInfo) {
  const { fileBlob = {} } = mediaInfo;

  const formData = new FormData();
  formData.append("mediaFile", fileBlob);

  await axios.post(ServiceUrl, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
}

const NetworkService = { uploadMedia };

export default NetworkService;
