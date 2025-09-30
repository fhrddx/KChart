import { useEffect } from 'react';
import { stockItemData, throttle } from './common';
import './index.scss';
import kline from './kline';
import { touchPan } from './touchPan';

export default function Index() {
  const init = () => {
    const container = document.getElementById('container')!;
    const width = Math.floor(container.clientWidth);
    const height = Math.floor(container.clientHeight);
    const stock = '0.002594';

    const getNewestData = (item: stockItemData) => {
      console.log('最新的数据是：' + JSON.stringify(item));
    };

    const changeIndex = throttle((item: stockItemData) => {
      console.log('hover：' + JSON.stringify(item));
    }, 150);

    //实例化第一个canvas面板
    const klineChart = new kline({
      canvasId: 'canvas',
      touchPanCanvasId: 'canvasTop',
      stock: stock,
      width: width,
      height: height,
      callback: getNewestData,
    });
    klineChart.create();

    //实例化一个操作层
    const touchPanChart = new touchPan(klineChart, changeIndex);
    touchPanChart.init();
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <div className="main-content">
      <div className="kline-container" id="container">
        <canvas id="canvas"></canvas>
        <canvas id="canvasTop"></canvas>
      </div>
    </div>
  );
}
