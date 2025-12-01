export interface ImageDAO {
  putImage(fileName: string, imageStringBase64: string): Promise<string>;
}
