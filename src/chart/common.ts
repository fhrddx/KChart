type stockItemData = {
  //日期
  date: string;
  //开盘价
  jk: number;
  //收盘价
  sp: number;
  //最高价
  zg: number;
  //最低价
  zd: number;
  //总手（成交量）
  zs: number;
  //金额
  je: number;
  //涨幅
  zf: number;
  //涨跌数
  zds: number;
  //换手率
  hs: number;
  //？暂时不知道是什么
  phl: string;
  //？暂时不知道是什么
  phe: string;
  //五日均线
  ju5: number;
  //十日均线
  ju10: number;
  //二十日均线
  ju20: number;
  //成交量快线，五日均线
  ma1: number;
  //成交量慢线，十日均线
  ma2: number;
};

type KlineConfig = {
  //canvas的ID
  canvasId: string;
  //触摸层的canvas的ID
  touchPanCanvasId: string;
  //股票编码
  stock: string;
  //整体的宽度
  width: number;
  //整体的高度
  height: number;
  //数据类型：101=日线，102=周线，103=月线
  klt?: number;
  //复权类型：1=前复权，2=后复权，0=不复权
  fqt?: number;
  //一屏数据数量
  lmt?: number;
  //均线信息区域的高度
  lineMessageHeight?: number;
  //成交量信息区域的高度
  tradeMessageHeight?: number;
  //时间区域的高度
  xLabelHeight?: number;
  //主图的占比
  mainChartHeightPercent?: number;
  //红色，上涨的颜色
  redColor?: string;
  //绿色，下跌的颜色
  greenColor?: string;
  //五日均线的颜色
  ma5Color?: string;
  //十日均线的颜色
  ma10Color?: string;
  //二十日均线的颜色
  ma20Color?: string;
  //横竖线的颜色
  gridColor?: string;
  //x轴的文字颜色， 包括x轴的时间、“成交量 69万”、“均线” 这几个文字的颜色
  xLabelColor?: string;
  //x轴的字体大小， 包括x轴的时间、“成交量 69万”、“均线” 这几个文字
  xLabelFontSize?: number;
  //x轴tooltip的背景颜色（十字交叉线对应的刻度的背景颜色）
  xLabelToolTipColor?: string;
  //y轴的数字刻度的颜色
  yLabelColor?: string;
  //y轴的字体大小
  yLabelFontSize?: number;
  //x轴tooltip的背景颜色（十字交叉线对应的刻度的背景颜色）
  yLabelToolTipColor?: string;
  //成交量快线的颜色
  cma1Color?: string;
  //成交量慢线的颜色
  cma2Color?: string;
  //横竖交叉线的颜色
  crossLineColor?: string;
  //背景颜色
  bgColor?: string;
  //回调函数
  callback?: (item: stockItemData) => void;
};

const fetchJsonp = (url: string, timeout: number = 10000): Promise<any> => {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error(`请求超时 (${timeout}ms)`));
    }, timeout);

    fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    })
      .then((response) => {
        clearTimeout(timeoutId);
        if (!response.ok) {
          throw new Error(`HTTP错误! 状态: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => {
        resolve(data);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          reject(new Error('请求被中止'));
        } else {
          reject(new Error(`网络请求失败: ${error.message}`));
        }
      });
  });
};

//计算均线
const countJunXina = (arrayList: any, index: number) => {
  //计算下20日的均线
  if (arrayList[index - 1].ju20 === 0) {
    let jun20 = 0;
    for (let i = index; i >= 0 && i > index - 20; i--) {
      jun20 += arrayList[i].sp;
    }
    jun20 = jun20 / 20;
    arrayList[index].ju20 = jun20;
  } else {
    arrayList[index].ju20 =
      (arrayList[index - 1].ju20 * 20 - arrayList[index - 20].sp + arrayList[index].sp) / 20;
  }
  //计算下10日的均线
  if (arrayList[index - 1].ju10 === 0) {
    let jun10 = 0;
    for (let i = index; i >= 0 && i > index - 10; i--) {
      jun10 += arrayList[i].sp;
    }
    jun10 = jun10 / 10;
    arrayList[index].ju10 = jun10;
  } else {
    arrayList[index].ju10 =
      (arrayList[index - 1].ju10 * 10 - arrayList[index - 10].sp + arrayList[index].sp) / 10;
  }
  //计算下5日的均线
  if (arrayList[index - 1].ju5 === 0) {
    let jun5 = 0;
    for (let i = index; i >= 0 && i > index - 5; i--) {
      jun5 += arrayList[i].sp;
    }
    jun5 = jun5 / 5;
    arrayList[index].ju5 = jun5;
  } else {
    arrayList[index].ju5 =
      (arrayList[index - 1].ju5 * 5 - arrayList[index - 5].sp + arrayList[index].sp) / 5;
  }
  //计算下成交量快线，5日线
  if (arrayList[index - 1].ma1 === 0) {
    let ma1 = 0;
    for (let i = index; i >= 0 && i > index - 5; i--) {
      ma1 += arrayList[i].zs;
    }
    ma1 = ma1 / 5;
    arrayList[index].ma1 = ma1;
  } else {
    arrayList[index].ma1 =
      (arrayList[index - 1].ma1 * 5 - arrayList[index - 5].zs + arrayList[index].zs) / 5;
  }
  //计算下成交量慢线，10日线
  if (arrayList[index - 1].ma2 === 0) {
    let ma2 = 0;
    for (let i = index; i >= 0 && i > index - 10; i--) {
      ma2 += arrayList[i].zs;
    }
    ma2 = ma2 / 10;
    arrayList[index].ma2 = ma2;
  } else {
    arrayList[index].ma2 =
      (arrayList[index - 1].ma2 * 10 - arrayList[index - 10].zs + arrayList[index].zs) / 10;
  }
};

const fetchKlineData = async ({
  stock,
  endDate,
  count,
}: {
  stock: string;
  endDate: string;
  count: number;
}) => {
  const field1 = 'f1,f2,f3,f4,f5,f6,f7,f8';
  const field2 = 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64';
  const ut = 'f057cbcbce2a86e2866ab8877db1d059';
  /*
  klt: 101=日线，102=周线，103=月线等
  fqt: 1=前复权，2=后复权，0=不复权
  lmt: 数据条数
  end: 数据截止日期
  iscca: 是否计算复权
  f1:股票代码,f2:股票名称,f3:市场类型
  f51:日期,f52:开盘价,f53:收盘价,f54:最高价,f55:最低价,f56:成交量,f57:成交额,f58:振幅,f59:涨跌幅,f60:涨跌额,f61:换手率
  前面有20条，显示46条
  */
  const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${stock}&klt=101&fqt=1&lmt=${
    count + 20
  }&end=${endDate}&iscca=1&fields1=${field1}&fields2=${field2}&ut=${ut}&forcect=1`;
  const response = await fetchJsonp(url);
  const list = response?.data?.klines || [];
  const arrayList: stockItemData[] = [];
  for (let i = 0; i < list.length; i++) {
    const item = list[i].split(',');
    arrayList.push({
      date: item[0],
      jk: Number(item[1]),
      sp: Number(item[2]),
      zg: Number(item[3]),
      zd: Number(item[4]),
      zs: Number(item[5]),
      je: Number(item[6]),
      zf: Number(item[8]),
      zds: item[9],
      hs: item[10],
      phl: item[11],
      phe: item[12],
      ju5: 0,
      ju10: 0,
      ju20: 0,
      ma1: 0,
      ma2: 0,
    });
  }
  for (let startIndex = 20; startIndex < arrayList.length; startIndex++) {
    countJunXina(arrayList, startIndex);
  }
  if (arrayList.length < count) {
    return arrayList;
  }
  const totalCount = arrayList.length;
  return arrayList.slice(totalCount - count, totalCount);
};

const extendObjectProps = (config: any, customerConfig: any) => {
  if (!config || !customerConfig) {
    return;
  }
  for (let key in customerConfig) {
    if (customerConfig.hasOwnProperty(key)) {
      const value = customerConfig[key];
      config[key] = value;
    }
  }
};

const defaultKlineConfig: KlineConfig = {
  canvasId: 'canvas',
  touchPanCanvasId: 'canvasTop',
  stock: '0.002594',
  width: 390,
  height: 500,
  klt: 101,
  fqt: 1,
  lmt: 35,
  lineMessageHeight: 30,
  tradeMessageHeight: 30,
  xLabelHeight: 30,
  mainChartHeightPercent: 0.75,
  redColor: '#d02d2d',
  greenColor: '#01a000',
  ma5Color: '#0a0a0a',
  ma10Color: '#ffbb32',
  ma20Color: '#db0d85',
  gridColor: '#ccc',
  xLabelColor: '#646464',
  xLabelFontSize: 14,
  xLabelToolTipColor: '#f7f8fa',
  yLabelColor: '#646464',
  yLabelFontSize: 14,
  yLabelToolTipColor: '#f7f8fa',
  cma1Color: '#ffbb32',
  cma2Color: '#db0d85',
  crossLineColor: '#646464',
  bgColor: '#ffffff',
};

const createDefaultKlineConfig = () => {
  return {
    ...defaultKlineConfig,
  };
};

export default fetchJsonp;

//节流函数
const throttle = (func: (...args: any) => void, delay: number) => {
  let lastCall = 0;
  let timeoutId: any;
  return function (...args: any) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;
    if (timeSinceLastCall < delay) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        func(...args);
      }, delay - timeSinceLastCall);
      return;
    }
    lastCall = now;
    func(...args);
  };
};

//防抖函数
const debounce = (func: (...args: any) => void, delay: number) => {
  let timeoutId: any;
  return function (...args: any) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};

export {
  createDefaultKlineConfig,
  debounce,
  extendObjectProps,
  fetchKlineData,
  throttle,
};

export type { KlineConfig, stockItemData }