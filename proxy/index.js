import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';

const app = express();

app.use(bodyParser.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  next();
});

app.post('/', async (req, res) => {
  const {
    method,
    url,
    auth,
    headers,
    data
  } = req.body;

  try {
    const payload = await axios({
      method,
      url,
      auth,
      headers,
      data
    });

    return await res.json({
      data: payload.data,
      status: payload.status,
      statusText: payload.statusText,
      headers: payload.headers,
    });

  } catch (error) {
    if (error.response) {
      const errorResponse = error.response;
      return await res.json({
        data: errorResponse.data,
        status: errorResponse.status,
        statusText: errorResponse.statusText,
        headers: errorResponse.headers,
      });
    } else {
      return res.status(500).send();
    }
  }
});

export default {
  path: '/proxy',
  handler: app
}
