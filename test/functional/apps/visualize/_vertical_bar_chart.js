/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'visualize', 'header']);

  describe('vertical bar chart', function () {
    const fromTime = '2015-09-19 06:31:44.000';
    const toTime = '2015-09-23 18:31:44.000';
    const vizName1 = 'Visualization VerticalBarChart';

    const initBarChart = async () => {
      log.debug('navigateToApp visualize');
      await PageObjects.common.navigateToUrl('visualize', 'new');
      log.debug('clickVerticalBarChart');
      await PageObjects.visualize.clickVerticalBarChart();
      await PageObjects.visualize.clickNewSearch();
      log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);
      log.debug('Bucket = X-Axis');
      await PageObjects.visualize.clickBucket('X-Axis');
      log.debug('Aggregation = Date Histogram');
      await PageObjects.visualize.selectAggregation('Date Histogram');
      log.debug('Field = @timestamp');
      await PageObjects.visualize.selectField('@timestamp');
      // leaving Interval set to Auto
      await PageObjects.visualize.clickGo();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.visualize.waitForVisualization();
    };


    before(initBarChart);

    it('should save and load', async function () {
      await PageObjects.visualize.saveVisualization(vizName1);
      const pageTitle = await PageObjects.common.getBreadcrumbPageTitle();
      log.debug(`Save viz page title is ${pageTitle}`);
      expect(pageTitle).to.contain(vizName1);
      await PageObjects.header.waitForToastMessageGone();
      await PageObjects.visualize.loadSavedVisualization(vizName1);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.visualize.waitForVisualization();
    });

    it('should have inspector enabled', async function () {
      const spyToggleExists = await PageObjects.visualize.isInspectorButtonEnabled();
      expect(spyToggleExists).to.be(true);
    });

    it('should show correct chart', async function () {
      const expectedChartValues = [37, 202, 740, 1437, 1371, 751, 188, 31, 42, 202, 683,
        1361, 1415, 707, 177, 27, 32, 175, 707, 1408, 1355, 726, 201, 29
      ];

      // Most recent failure on Jenkins usually indicates the bar chart is still being drawn?
      // return arguments[0].getAttribute(arguments[1]);","args":[{"ELEMENT":"592"},"fill"]}] arguments[0].getAttribute is not a function
      // try sleeping a bit before getting that data
      await retry.try(async () => {
        const data = await PageObjects.visualize.getBarChartData();
        log.debug('data=' + data);
        log.debug('data.length=' + data.length);
        expect(data).to.eql(expectedChartValues);
      });
    });

    it('should show correct data', async function () {
      // this is only the first page of the tabular data.
      const expectedChartData =  [
        ['2015-09-20 00:00', '37'],
        ['2015-09-20 03:00', '202'],
        ['2015-09-20 06:00', '740'],
        ['2015-09-20 09:00', '1,437'],
        ['2015-09-20 12:00', '1,371'],
        ['2015-09-20 15:00', '751'],
        ['2015-09-20 18:00', '188'],
        ['2015-09-20 21:00', '31'],
        ['2015-09-21 00:00', '42'],
        ['2015-09-21 03:00', '202'],
      ];

      await PageObjects.visualize.openInspector();
      const data = await PageObjects.visualize.getInspectorTableData();
      log.debug(data);
      expect(data).to.eql(expectedChartData);
    });

    describe('vertical bar with split series', function () {
      before(initBarChart);

      it('should show correct series', async function () {
        await PageObjects.visualize.toggleOpenEditor(2, 'false');
        await PageObjects.visualize.clickAddBucket();
        await PageObjects.visualize.clickBucket('Split Series');
        await PageObjects.visualize.selectAggregation('Terms');
        await PageObjects.visualize.selectField('response.raw');
        await PageObjects.header.waitUntilLoadingHasFinished();

        await PageObjects.common.sleep(1003);
        await PageObjects.visualize.clickGo();
        await PageObjects.header.waitUntilLoadingHasFinished();

        const expectedEntries = ['200', '404', '503'];
        const legendEntries = await PageObjects.visualize.getLegendEntries();
        expect(legendEntries).to.eql(expectedEntries);
      });
    });

    describe('vertical bar with multiple splits', function () {
      before(initBarChart);

      it('should show correct series', async function () {
        await PageObjects.visualize.toggleOpenEditor(2, 'false');
        await PageObjects.visualize.clickAddBucket();
        await PageObjects.visualize.clickBucket('Split Series');
        await PageObjects.visualize.selectAggregation('Terms');
        await PageObjects.visualize.selectField('response.raw');
        await PageObjects.header.waitUntilLoadingHasFinished();

        await PageObjects.visualize.toggleOpenEditor(3, 'false');
        await PageObjects.visualize.clickAddBucket();
        await PageObjects.visualize.clickBucket('Split Series');
        await PageObjects.visualize.selectAggregation('Terms');
        await PageObjects.visualize.selectField('machine.os');
        await PageObjects.header.waitUntilLoadingHasFinished();

        await PageObjects.common.sleep(1003);
        await PageObjects.visualize.clickGo();
        await PageObjects.header.waitUntilLoadingHasFinished();

        const expectedEntries = [
          '200 - win 8', '200 - win xp', '200 - ios', '200 - osx', '200 - win 7',
          '404 - ios', '503 - ios', '503 - osx', '503 - win 7', '503 - win 8',
          '503 - win xp', '404 - osx', '404 - win 7', '404 - win 8', '404 - win xp'
        ];
        const legendEntries = await PageObjects.visualize.getLegendEntries();
        expect(legendEntries).to.eql(expectedEntries);
      });

      it('should show correct series when disabling first agg', async function () {
        await PageObjects.visualize.toggleDisabledAgg(3);
        await PageObjects.visualize.clickGo();
        await PageObjects.header.waitUntilLoadingHasFinished();

        const expectedEntries = [ 'win 8', 'win xp', 'ios', 'osx', 'win 7' ];
        const legendEntries = await PageObjects.visualize.getLegendEntries();
        expect(legendEntries).to.eql(expectedEntries);
      });
    });

    describe('vertical bar with derivative', function () {
      before(initBarChart);

      it('should show correct series', async function () {
        await PageObjects.visualize.toggleOpenEditor(2, 'false');
        await PageObjects.visualize.toggleOpenEditor(1);
        await PageObjects.visualize.selectAggregation('Derivative', 'metrics');
        await PageObjects.header.waitUntilLoadingHasFinished();


        await PageObjects.common.sleep(1003);
        await PageObjects.visualize.clickGo();
        await PageObjects.header.waitUntilLoadingHasFinished();

        const expectedEntries = [
          'Derivative of Count'
        ];
        const legendEntries = await PageObjects.visualize.getLegendEntries();
        expect(legendEntries).to.eql(expectedEntries);
      });

    });
  });
}
