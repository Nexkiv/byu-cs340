import { ImageDAO } from "../interface/ImageDAO";
import { S3Client, PutObjectCommand, ObjectCannedACL } from "@aws-sdk/client-s3";
import { Buffer } from "buffer";

export class S3ImageDAO implements ImageDAO {
  private bucketName = "tweeter-profile-images-kevkp";
  private region = "us-east-1";
  private client = new S3Client({ region: this.region });

  async putImage(fileName: string, imageStringBase64: string): Promise<string> {
    const decodedImageBuffer: Buffer = Buffer.from(imageStringBase64, "base64");
    const contentType = this.getContentType(fileName);

    const s3Params = {
      Bucket: this.bucketName,
      Key: `images/${fileName}`,
      Body: decodedImageBuffer,
      ContentType: contentType,
      ACL: ObjectCannedACL.public_read,
    };

    const command = new PutObjectCommand(s3Params);

    try {
      await this.client.send(command);
      return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/images/${fileName}`;
    } catch (error) {
      throw new Error(`Failed to upload image to S3: ${error}`);
    }
  }

  private getContentType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'png': return 'image/png';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'gif': return 'image/gif';
      case 'webp': return 'image/webp';
      default: return 'image/png';
    }
  }
}
