import { QueryApi } from '@influxdata/influxdb-client';
import { Express } from 'express';
import { TimeSeriesResponse } from './interface';
import throwBasedOnCode, { generateErrorBasedOnCode, getStatusCodeBasedOnError } from './throws';
import { executeInflux } from './utils';
import { buildQuery, InfluxQuery } from './utilsInflux';


export async function getLineGraphAPI(
  queryClient: QueryApi,
  influxRequest: InfluxQuery,
): Promise<TimeSeriesResponse | undefined> {
  /**
   * TODO:
   */
  //no fields specified. Many fields in InfluxDB are irrelevant, will not return all
  if (influxRequest.fields === undefined) {
    throwBasedOnCode('e400.19', JSON.stringify(influxRequest) as string);
  }

  //prepare output object skeleton
  //  arrow function will create new arrays, so they are not shared between players
  let generateStatsSkeleton = () => Object.fromEntries(influxRequest.fields!.map((f) => [f, []]));
  let output: TimeSeriesResponse = {};
  
  //frontend may specify a filter for player's names
  //we can construct the playernames section from this
  if (influxRequest.names !== undefined) {
    output = Object.fromEntries(influxRequest.names.map((p) => [p, generateStatsSkeleton()]));
  }

  //perform query
  const influxResponse = await executeInflux(buildQuery(influxRequest), queryClient);

  //organise times and values into output
  influxResponse.forEach((row) => {
    //request may not have specified names, extract from influxResponse
    if (!((row['Player Name'] as string) in output)) {
      output[row['Player Name']] = generateStatsSkeleton();
    }

    output[row['Player Name']][row._field].push([row._time, row._value]);
  });
  return output;
}

export default function bindGetLineGraph(
  app: Express,
  queryClient: QueryApi,
) {
  /**
   * TODO:
   *  [ ] any role management?
   */
  app.get('/lineGraph', async (req, res) => {
    try {
      //must log in
      if (req.session.username === undefined) {
        res.status(401).send({
          name: 'Error',
          error: generateErrorBasedOnCode('e401.0').message,
        });
        return;
      }

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
