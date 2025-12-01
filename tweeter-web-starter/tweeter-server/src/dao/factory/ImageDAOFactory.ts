import { ImageDAO } from "../interface/ImageDAO";
import { S3ImageDAO } from "../s3/S3ImageDAO";

export class ImageDAOFactory {
  static create(type: "s3"): ImageDAO {
    switch (type) {
      case "s3":
        return new S3ImageDAO();
      default:
        throw new Error("Unsupported DAO type");
    }
  }
}
