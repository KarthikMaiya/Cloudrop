import { Upload } from "@aws-sdk/lib-storage";
import s3 from "./aws-config";

const BUCKET_NAME = "cloudrop-storage";

export const uploadFile = async (file) => {
  try {
    const fileName = `${Date.now()}-${file.name}`;

    const upload = new Upload({
      client: s3,
      params: {
        Bucket: BUCKET_NAME,
        Key: `uploads/${fileName}`,
        Body: file,
        ContentType: file.type,
      },
    });

    await upload.done();

    const uploadedUrl = `https://${BUCKET_NAME}.s3.ap-south-1.amazonaws.com/uploads/${fileName}`;

    return uploadedUrl;
  } catch (error) {
    console.error("Upload Error:", error);

    alert("Upload failed");
  }
};