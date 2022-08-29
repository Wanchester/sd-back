import { QueryApi } from '@influxdata/influxdb-client';
import { Express } from 'express';
import { TimeSeriesResponse } from './interface';
import throwBasedOnCode, { getStatusCodeBasedOnError } from './throws';
import { executeInflux } from './utils';
import { buildQuery, InfluxQuery } from './utilsInflux';


export async function getLineGraphAPI(
  queryClient: QueryApi,
  influxRequest: InfluxQuery,
): Promise<TimeSeriesResponse | undefined> {
  if (influxRequest.names === undefined || influxRequest.fields === undefined) {
    throwBasedOnCode('e400.19', influxRequest);
    return;
  }
  const influxResponse = await executeInflux(buildQuery(influxRequest), queryClient);
  let stats: { [s:string]:[string, number][] } = Object.fromEntries(influxRequest.fields.map((f) => [f, []]));
  let output = Object.fromEntries(influxRequest.names.map((p) => [p, stats]));
  influxResponse.forEach((row) => {
    output[row['Player Name']][row._field].push([row._time, row._value]);
  });
  return output;
}

export default function bindGetLineGraph(
  app: Express,
  queryClient: QueryApi,
) {
  app.get('/lineGraph', async (req, res) => {
    try {
      const lineGraphData = await getLineGraphAPI(queryClient, req.body as InfluxQuery);
      res.status(200).send(lineGraphData);
    } catch (error) {
      res.status(getStatusCodeBasedOnError(error as Error)).send({
        error: (error as Error).message,
        name: (error as Error).name,
      });
    }
  });
}
