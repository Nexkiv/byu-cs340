import { TweeterRequest, TweeterResponse } from "tweeter-shared";

export class ClientCommunicator {
  private SERVER_URL: string;

  public constructor(SERVER_URL: string) {
    this.SERVER_URL = SERVER_URL;
  }

  public async doPost<REQ extends TweeterRequest, RES extends TweeterResponse>(
    req: REQ | undefined,
    endpoint: string,
    headers?: Headers
  ): Promise<RES> {
    if (headers && req) {
      headers.append("Content-type", "application/json");
    } else if (req) {
      headers = new Headers({
        "Content-type": "application/json",
      });
    }

    console.log(`The request body is '${JSON.stringify(req)}'`);

    const url = this.getUrl(endpoint);
    const params = this.getParams(
      "POST",
      headers,
      req ? JSON.stringify(req) : req
    );

    console.log(`Fetching '${url}' with params '${JSON.stringify(params)}'`);

    try {
      const resp: Response = await fetch(url, params);

      if (resp.ok) {
        // Be careful with the return type here. resp.json() returns Promise<any> which means there is no type checking on response.
        const response: RES = await resp.json();
        return response;
      } else {
        const error = await resp.json();

        // Check for 401 Unauthorized - redirect to login
        if (resp.status === 401) {
          sessionStorage.setItem('loginMessage', 'Session expired. Please login again.');
          window.location.href = "/login";
          throw new Error("Session expired. Please login again.");
        }

        throw new Error(error.error);
      }
    } catch (error) {
      console.error(error);
      // Only wrap actual network errors, not API errors
      if (error instanceof Error && error.message.includes('Session expired')) {
        throw error;  // Pass through redirect errors
      }
      if (error instanceof TypeError || (error instanceof Error && error.message.includes('fetch'))) {
        throw new Error('Network error: Unable to reach server');
      }
      throw error;  // Pass through API errors unchanged
    }
  }

  private getUrl(endpoint: string): string {
    return this.SERVER_URL + endpoint;
  }

  private getParams(
    method: string,
    headers?: Headers,
    body?: BodyInit
  ): RequestInit {
    const params: RequestInit = { method: method };

    if (headers) {
      params.headers = headers;
    }

    if (body) {
      params.body = body;
    }

    return params;
  }
}
