export const handler = async function (event: any) {
  for (let i = 0; i < event.Records.length; ++i) {
    const { body } = event.Records[i];
    // Code to print message body to the log.
    console.log(body);
  }
  return null;
};
