import {
  createDefaultKlineConfig,
  extendObjectProps,
  fetchKlineData,
  KlineConfig,
  stockItemData,
} from './common';

export default class kline {
  public config: KlineConfig;
  private canvasCxt: any;
  private arrayList: stockItemData[] = [];
  public startIndex = 0;
  public mainChartHeight = 0;
  public subChartHeight = 0;
  private max = 0;
  private min = 0;
  private maxAmount = 0;
  private newestItem: stockItemData | null = null;
  private isTheFirstTimeFetch: boolean = true;
  //上次获取数据的时间
  private fetchDataTime: number = Date.now();

  constructor(params: KlineConfig) {
    //传入的参数将替换默认的样式配置
    this.config = createDefaultKlineConfig();
    extendObjectProps(this.config, params);
    //获取相关参数
    const {
      canvasId,
      width,
      height,
      mainChartHeightPercent,
      lineMessageHeight,
      tradeMessageHeight,
      xLabelHeight,
    } = this.config;
    const dpr = window.devicePixelRatio || 1;
    //根据传入的参数，调整canvas的尺寸大小
    const canvas: any = document.getElementById(canvasId)!;
    if (canvas) {
      canvas.width = (width + 1) * dpr;
      canvas.height = (height + 1) * dpr;
      canvas.style.height = height + 1 + 'px';
      canvas.style.width = width + 1 + 'px';
    }
    //获取canvas绘画的上下文
    this.canvasCxt = canvas.getContext('2d');
    this.canvasCxt.translate(0.5, 0.5);
    this.canvasCxt.scale(dpr, dpr);
    //主图的高度
    this.mainChartHeight = Math.floor(
      (height - lineMessageHeight! - tradeMessageHeight! - xLabelHeight!) * mainChartHeightPercent!,
    );
    //副图的高度
    this.subChartHeight =
      height - lineMessageHeight! - tradeMessageHeight! - xLabelHeight! - this.mainChartHeight;
  }

  //初始化数据并画图
  public async create() {
    const date = new Date();
    const list = await fetchKlineData({
      stock: this.config.stock,
      endDate: `${date.getFullYear()}${(date.getMonth() + 1 + '').padStart(2, '0')}${(
        date.getDate() + ''
      ).padStart(2, '0')}`,
      count: 2 * this.config.lmt!,
    });
    this.arrayList = list;
    if (this.isTheFirstTimeFetch && list && list.length > 0) {
      this.newestItem = list[list.length - 1];
    }
    this.startIndex = Math.max(this.arrayList.length - this.config.lmt!, 0);
    this.drawCanvasAll();
  }

  //画出整个K线图
  private drawCanvasAll() {
    this.canvasCxt.clearRect(-1, -1, this.config.width + 2, this.config.height + 2);
    //股价最高值
    let max = this.arrayList[this.startIndex].zg;
    //股价最低值
    let min = this.arrayList[this.startIndex].zd;
    //最大成交量
    let maxAmount = this.arrayList[this.startIndex].zs;
    //计算在制定的区间内，上面三个指标数据
    for (
      let i = this.startIndex;
      i < this.arrayList.length && i < this.startIndex + this.config.lmt!;
      i++
    ) {
      let item = this.arrayList[i];
      max = Math.max(item.zg, max);
      min = Math.min(item.zd, min);
      maxAmount = Math.max(maxAmount, item.zs);
    }
    this.max = max;
    this.min = min;
    this.maxAmount = maxAmount;

    //画出网格线
    this.drawGridLine();
    //画出蜡烛图
    this.drawCandles(max, min, maxAmount);
    //画出各类均线
    this.drawLines(max, min, maxAmount);
    //画出y轴的刻度线
    this.drawYlabels(max, min);
    //执行回调
    if (this.config.callback && this.isTheFirstTimeFetch) {
      this.config.callback(this.arrayList[this.arrayList.length - 1]);
    }
    if (this.isTheFirstTimeFetch) {
      this.isTheFirstTimeFetch = false;
    }
  }

  //画出各类均线
  private drawLines(max: number, min: number, maxAmount: number) {
    //将宽度分成n个小区间， 一个小区间画一个蜡烛， 每个区间的宽度是 splitW
    const splitW = this.config.width / this.config.lmt!;

    //画一下5日均线
    this.canvasCxt.beginPath();
    this.canvasCxt.strokeStyle = this.config.ma5Color;
    this.canvasCxt.lineWidth = 1;
    let isTheFirstItem = true;
    for (
      let i = this.startIndex;
      i < this.arrayList.length && i < this.startIndex + this.config.lmt!;
      i++
    ) {
      const index = i - this.startIndex;
      let value = this.arrayList[i].ju5;
      if (value === 0) {
        continue;
      }
      //均线的值有可能越过方框边界线
      if (value > this.max || value < this.min) {
        const nextIndex = i + 1;
        if (nextIndex < this.arrayList.length && nextIndex < this.startIndex + this.config.lmt!) {
          const nextItem = this.arrayList[nextIndex];
          if (this.min < nextItem.ju5 && nextItem.ju5 < this.max) {
            if (value > this.max) {
              value = this.max;
            } else if (value < this.min) {
              value = this.min;
            }
          } else {
            continue;
          }
        }
      }
      const x = Math.floor(index * splitW + 0.5 * splitW);
      const y = Math.floor(
        ((max - value) / (max - min)) * this.mainChartHeight + this.config.lineMessageHeight!,
      );
      if (isTheFirstItem) {
        this.canvasCxt.moveTo(x, y);
        isTheFirstItem = false;
      } else {
        this.canvasCxt.lineTo(x, y);
      }
    }
    this.canvasCxt.stroke();

    //画一下10日均线
    this.canvasCxt.beginPath();
    this.canvasCxt.strokeStyle = this.config.ma10Color;
    this.canvasCxt.lineWidth = 1;
    isTheFirstItem = true;
    for (
      let i = this.startIndex;
      i < this.arrayList.length && i < this.startIndex + this.config.lmt!;
      i++
    ) {
      const index = i - this.startIndex;
      let value = this.arrayList[i].ju10;
      if (value === 0) {
        continue;
      }
      //均线的值有可能越过方框边界线
      if (value > this.max || value < this.min) {
        const nextIndex = i + 1;
        if (nextIndex < this.arrayList.length && nextIndex < this.startIndex + this.config.lmt!) {
          const nextItem = this.arrayList[nextIndex];
          if (this.min < nextItem.ju10 && nextItem.ju10 < this.max) {
            if (value > this.max) {
              value = this.max;
            } else if (value < this.min) {
              value = this.min;
            }
          } else {
            continue;
          }
        }
      }
      const x = Math.floor(index * splitW + 0.5 * splitW);
      const y = Math.floor(
        ((max - value) / (max - min)) * this.mainChartHeight + this.config.lineMessageHeight!,
      );
      if (isTheFirstItem) {
        this.canvasCxt.moveTo(x, y);
        isTheFirstItem = false;
      } else {
        this.canvasCxt.lineTo(x, y);
      }
    }
    this.canvasCxt.stroke();

    //画一下20日均线
    this.canvasCxt.beginPath();
    this.canvasCxt.strokeStyle = this.config.ma20Color;
    this.canvasCxt.lineWidth = 1;
    isTheFirstItem = true;
    for (
      let i = this.startIndex;
      i < this.arrayList.length && i < this.startIndex + this.config.lmt!;
      i++
    ) {
      const index = i - this.startIndex;
      let value = this.arrayList[i].ju20;
      if (value === 0) {
        continue;
      }
      //均线的值有可能越过方框边界线
      if (value > this.max || value < this.min) {
        const nextIndex = i + 1;
        if (nextIndex < this.arrayList.length && nextIndex < this.startIndex + this.config.lmt!) {
          const nextItem = this.arrayList[nextIndex];
          if (this.min < nextItem.ju20 && nextItem.ju20 < this.max) {
            if (value > this.max) {
              value = this.max;
            } else if (value < this.min) {
              value = this.min;
            }
          } else {
            continue;
          }
        }
      }
      const x = Math.floor(index * splitW + 0.5 * splitW);
      const y = Math.floor(
        ((max - value) / (max - min)) * this.mainChartHeight + this.config.lineMessageHeight!,
      );
      if (isTheFirstItem) {
        this.canvasCxt.moveTo(x, y);
        isTheFirstItem = false;
      } else {
        this.canvasCxt.lineTo(x, y);
      }
    }
    this.canvasCxt.stroke();

    //画一下成交量快线
    this.canvasCxt.beginPath();
    this.canvasCxt.strokeStyle = this.config.cma1Color;
    this.canvasCxt.lineWidth = 1;
    isTheFirstItem = true;
    for (
      let i = this.startIndex;
      i < this.arrayList.length && i < this.startIndex + this.config.lmt!;
      i++
    ) {
      const index = i - this.startIndex;
      const value = this.arrayList[i].ma1;
      if (value === 0) {
        continue;
      }
      const x = Math.floor(index * splitW + 0.5 * splitW);
      const y = Math.floor(
        this.config.height - (value / maxAmount) * this.subChartHeight - this.config.xLabelHeight!,
      );
      if (isTheFirstItem) {
        this.canvasCxt.moveTo(x, y);
        isTheFirstItem = false;
      } else {
        this.canvasCxt.lineTo(x, y);
      }
    }
    this.canvasCxt.stroke();

    //画一下成交量慢线
    this.canvasCxt.beginPath();
    this.canvasCxt.strokeStyle = this.config.cma2Color;
    this.canvasCxt.lineWidth = 1;
    isTheFirstItem = true;
    for (
      let i = this.startIndex;
      i < this.arrayList.length && i < this.startIndex + this.config.lmt!;
      i++
    ) {
      const index = i - this.startIndex;
      const value = this.arrayList[i].ma2;
      if (value === 0) {
        continue;
      }
      const x = index * splitW + 0.5 * splitW;
      const y =
        this.config.height - (value / maxAmount) * this.subChartHeight - this.config.xLabelHeight!;
      if (isTheFirstItem) {
        this.canvasCxt.moveTo(x, y);
        isTheFirstItem = false;
      } else {
        this.canvasCxt.lineTo(x, y);
      }
    }
    this.canvasCxt.stroke();
  }

  //画出蜡烛图
  private drawCandles(max: number, min: number, maxAmount: number) {
    if (!(this.startIndex >= 0 && this.startIndex < this.arrayList.length)) {
      return;
    }
    //将宽度分成n个小区间， 一个小区间画一个蜡烛， 每个区间的宽度是 splitW
    const splitW = this.config.width / this.config.lmt!;
    //蜡烛占小区间的宽度
    const widthPercent = 0.7;
    //画出蜡烛图、成交量图
    for (
      let i = this.startIndex;
      i < this.arrayList.length && i < this.startIndex + this.config.lmt!;
      i++
    ) {
      const index = i - this.startIndex;
      let item = this.arrayList[i];
      //先定下颜色
      this.canvasCxt.beginPath();
      this.canvasCxt.strokeStyle =
        item.sp >= item.jk ? this.config.redColor : this.config.greenColor;
      //当天是一字线的情况
      if (item.zg === item.zd) {
        const x1 = Math.floor(splitW * index + (splitW * (1 - widthPercent)) / 2);
        const x2 = Math.floor(splitW * index + splitW * (widthPercent + (1 - widthPercent) / 2));
        const y = Math.floor(
          ((max - item.zg) / (max - min)) * this.mainChartHeight + this.config.lineMessageHeight!,
        );
        this.drawLine(x1, y, x2, y);
        continue;
      }
      //将上下影线画出来
      const x = Math.floor(index * splitW + 0.5 * splitW);
      const zgY = Math.floor(
        ((max - item.zg) / (max - min)) * this.mainChartHeight + this.config.lineMessageHeight!,
      );
      const zdY = Math.floor(
        ((max - item.zd) / (max - min)) * this.mainChartHeight + this.config.lineMessageHeight!,
      );
      this.drawLine(x, zgY, x, zdY);
      this.canvasCxt.beginPath();
      //画出矩形
      const jx = Math.floor(index * splitW + (splitW * (1 - widthPercent)) / 2);
      let jzg = 0;
      let jzd = 0;
      if (item.sp >= item.jk) {
        jzg = Math.floor(
          ((max - item.sp) / (max - min)) * this.mainChartHeight + this.config.lineMessageHeight!,
        );
        jzd = Math.floor(
          ((max - item.jk) / (max - min)) * this.mainChartHeight + this.config.lineMessageHeight!,
        );
        this.canvasCxt.strokeStyle = this.config.redColor;
        this.canvasCxt.fillStyle = '#ffffff';
        //注意：先填充再描边，这样边框更清晰一点
        this.canvasCxt.rect(jx, jzg, Math.floor(widthPercent * splitW), jzd - jzg);
        this.canvasCxt.fill();
        this.canvasCxt.stroke();
      } else {
        jzg = Math.floor(
          ((max - item.jk) / (max - min)) * this.mainChartHeight + this.config.lineMessageHeight!,
        );
        jzd = Math.floor(
          ((max - item.sp) / (max - min)) * this.mainChartHeight + this.config.lineMessageHeight!,
        );
        this.canvasCxt.strokeStyle = this.config.greenColor;
        this.canvasCxt.fillStyle = this.config.greenColor;
        //注意：先填充再描边，这样边框更清晰一点
        this.canvasCxt.rect(jx, jzg, Math.floor(widthPercent * splitW), jzd - jzg);
        this.canvasCxt.fill();
        this.canvasCxt.stroke();
      }
      //画一下成交量
      const amountHeight = (item.zs / maxAmount) * this.subChartHeight;
      const amountY = Math.floor(this.config.height - amountHeight - this.config.xLabelHeight!);
      //注意：先填充再描边，这样边框更清晰一点
      this.canvasCxt.rect(jx, amountY, Math.floor(widthPercent * splitW), Math.floor(amountHeight));
      this.canvasCxt.fill();
      this.canvasCxt.stroke();
    }
  }

  //画出网格线
  private drawGridLine() {
    //获取配置参数
    const { gridColor, lineMessageHeight, xLabelHeight, width, height } = this.config;
    //画出K线图的5条横线
    const split = this.mainChartHeight / 4;
    this.canvasCxt.beginPath();
    this.canvasCxt.lineWidth = 1;
    this.canvasCxt.strokeStyle = gridColor;
    for (let i = 0; i <= 4; i++) {
      const splitHeight = Math.floor(split * i) + lineMessageHeight!;
      this.drawLine(0, splitHeight, width, splitHeight);
    }
    //画出K线图的2条竖线
    this.drawLine(0, lineMessageHeight!, 0, lineMessageHeight! + this.mainChartHeight);
    this.drawLine(width, lineMessageHeight!, width, lineMessageHeight! + this.mainChartHeight);
    //画出成交量的矩形
    this.canvasCxt.strokeRect(
      0,
      height - xLabelHeight! - this.subChartHeight,
      width,
      this.subChartHeight,
    );
  }

  //画出y轴的刻度线
  private drawYlabels(max: number, min: number) {
    let lastIndex = this.startIndex + this.config.lmt! - 1;
    if (lastIndex > this.arrayList.length - 1) {
      lastIndex = this.arrayList.length - 1;
    }

    //画一下Y轴的刻度文字
    this.canvasCxt.beginPath();
    this.canvasCxt.font = `${this.config.yLabelFontSize}px "Segoe UI", Arial, sans-serif`;
    this.canvasCxt.textBaseline = 'alphabetic';
    this.canvasCxt.fillStyle = this.config.yLabelColor;
    const transY = 3;
    for (let i = 1; i <= 4; i++) {
      this.canvasCxt.fillText(
        (max - ((max - min) / 4) * i).toFixed(2),
        1,
        Math.floor(this.config.lineMessageHeight! + (this.mainChartHeight / 4) * i) - transY,
      );
    }
    this.canvasCxt.textBaseline = 'top';
    this.canvasCxt.fillText(max.toFixed(2), 1, this.config.lineMessageHeight!);

    //x轴最左边的刻度
    this.canvasCxt.beginPath();
    this.canvasCxt.font = `${this.config.xLabelFontSize}px "Segoe UI", Arial, sans-serif`;
    this.canvasCxt.textBaseline = 'middle';
    this.canvasCxt.fillStyle = this.config.xLabelColor;
    this.canvasCxt.fillText(
      ` ${this.arrayList[this.startIndex].date} `,
      0,
      Math.floor(this.config.height - this.config.xLabelHeight! / 2 + 1),
    );
    //x轴最右边的刻度
    this.canvasCxt.textAlign = 'right';
    this.canvasCxt.fillText(
      ` ${this.arrayList[lastIndex].date} `,
      this.config.width,
      Math.floor(this.config.height - this.config.xLabelHeight! / 2 + 1),
    );

    if (!this.newestItem) {
      return;
    }
    //头部的均线标签
    const lineMessageHeightY = Math.floor(this.config.lineMessageHeight! / 2 + 1);
    this.canvasCxt.textAlign = 'left';
    this.canvasCxt.textBaseline = 'middle';
    this.canvasCxt.fillStyle = this.config.xLabelColor;
    const htext1 = ` 均线 MA5:${this.newestItem.ju5.toFixed(2)}  `;
    this.canvasCxt.fillText(htext1, 0, lineMessageHeightY);

    const htext1width = Math.floor(this.canvasCxt.measureText(htext1).width);
    const htext2 = ` MA10:${this.newestItem.ju10.toFixed(2)}  `;
    this.canvasCxt.fillStyle = this.config.ma10Color;
    this.canvasCxt.fillText(htext2, htext1width, lineMessageHeightY);

    const htext2width = Math.floor(this.canvasCxt.measureText(htext2).width);
    const htext3 = ` MA20:${this.newestItem.ju20.toFixed(2)}  `;
    this.canvasCxt.fillStyle = this.config.ma20Color;
    this.canvasCxt.fillText(htext3, htext1width + htext2width, lineMessageHeightY);

    //画一下成交量的文字
    const tY =
      Math.floor(
        this.config.lineMessageHeight! + this.mainChartHeight + this.config.tradeMessageHeight! / 2,
      ) + 1;
    const text1 = ` 成交量 ${this.getAmount(this.newestItem.zs)}  `;
    this.canvasCxt.fillStyle = this.config.xLabelColor;
    this.canvasCxt.fillText(text1, 0, tY);

    const text1width = Math.floor(this.canvasCxt.measureText(text1).width);
    const text2 = ` MA1: ${this.getAmount(this.newestItem.ma1)}  `;
    this.canvasCxt.fillStyle = this.config.cma1Color;
    this.canvasCxt.fillText(text2, text1width, tY);

    const text2width = Math.floor(this.canvasCxt.measureText(text2).width);
    const text3 = ` MA2: ${this.getAmount(this.newestItem.ma2)}  `;
    this.canvasCxt.fillStyle = this.config.cma2Color;
    this.canvasCxt.fillText(text3, text1width + text2width, tY);
  }

  //画出两个点形成的直线
  private drawLine(x1: number, y1: number, x2: number, y2: number) {
    this.canvasCxt.moveTo(x1, y1);
    this.canvasCxt.lineTo(x2, y2);
    this.canvasCxt.stroke();
  }

  //根据触摸层的x, y返回某一天的数据， 以及y的高度
  public getItemInfo(x: number, y: number) {
    const splitWidth = this.config.width / this.config.lmt!;
    const index = Math.floor(x / splitWidth) + this.startIndex;
    if (!(index >= 0 && index < this.arrayList.length)) {
      return null;
    }
    let yHeight = this.config.lineMessageHeight! + this.mainChartHeight - y;
    //这个时候焦点在主图上, yLabel显示的是股票价格
    if (yHeight >= 0) {
      return {
        item: this.arrayList[index],
        yLabel: ((yHeight / this.mainChartHeight) * (this.max - this.min) + this.min).toFixed(2),
      };
    }
    //这个时候，横线在主图与幅图之前，yLabel干脆设置为空白
    if (Math.abs(yHeight) < this.config.tradeMessageHeight!) {
      return {
        item: this.arrayList[index],
        yLabel: '',
      };
    }
    //这个时候焦点在副图上，yLabel显示的是成交量
    yHeight = this.config.height - this.config.xLabelHeight! - y;
    const yLabelString = this.getAmount((yHeight / this.subChartHeight) * this.maxAmount);
    return {
      item: this.arrayList[index],
      yLabel: yLabelString,
    };
  }

  //成交量的相关单位
  private getAmount(value: number) {
    if (value > 1e8) {
      return (value / 1e8).toFixed(2) + '亿';
    }
    if (value > 1e4) {
      return (value / 1e4).toFixed(1) + '万';
    }
    return (value / 1).toFixed(0);
  }

  //相对于列表的开始index，向右滑动了 offsetX
  public slideOffsetX(index: number, offsetX: number) {
    if(offsetX < 0 && this.startIndex >= this.arrayList.length - this.config.lmt!){
      return;
    }
    const splitW = this.config.width / this.config.lmt!;
    const slideIndex = Math.floor(offsetX / splitW);
    let newIndex = index - slideIndex;
    if (newIndex < 0) {
      newIndex = 0;
    } else if (newIndex > this.arrayList.length - 1) {
      newIndex = this.arrayList.length - 1;
    }
    if (newIndex === this.startIndex) {
      return;
    }
    if(newIndex > this.arrayList.length - this.config.lmt!){
      newIndex = this.arrayList.length - this.config.lmt!
    }
    this.startIndex = newIndex;
    this.drawCanvasAll();
  }

  //检查下是否需要增加数据
  public async tryFetchData(){
    const timeInterval = Date.now() - this.fetchDataTime;
    if(timeInterval < 1000){
      return;
    }
    this.fetchDataTime = Date.now();
    if(this.startIndex < this.config.lmt!){
      const date = this.arrayList[0].date;
      const list = await fetchKlineData({
        stock: this.config.stock,
        endDate: `${date.replace('-', '').replace('-', '')}`,
        count: 2 * this.config.lmt!,
      });
      for(let i = list.length -1; i >= 0; i--){
        const date = new Date(list[i].date);
        if(date >= new Date(this.arrayList[0].date)){
          list.pop();
        }
      }
      let newArrayList = [...list, ...this.arrayList];
      if(newArrayList.length > 5 * this.config.lmt!){
        newArrayList = newArrayList.slice(0, 5 * this.config.lmt!);
      }
      const newStartIndex = this.startIndex + list.length;
      this.arrayList = newArrayList;
      this.startIndex = newStartIndex;
      return;
    }
    //如果右边还是比较充足的话，就不补充数据了
    if(this.arrayList.length - this.startIndex > 3 * this.config.lmt!){
      return;
    }
    if(this.arrayList[this.arrayList.length - 1].date === this.newestItem?.date){
      return;
    }
    const date = new Date(this.arrayList[this.arrayList.length - 1].date.replace('-', '/').replace('-','/'));
    const days = Math.floor(this.config.lmt! / 35 * 46);
    const endDate = new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
    const list = await fetchKlineData({
      stock: this.config.stock,
      endDate: `${endDate.getFullYear()}${(endDate.getMonth() + 1 + '').padStart(2, '0')}${(endDate.getDate() + '').padStart(2, '0')}`,
      count: 3 * this.config.lmt!,
    });
    const lastItemDate = new Date(this.arrayList[this.arrayList.length - 1].date);
    for(let i = 0; i < list.length; i++){
      const date = new Date(list[i].date);
      if(date <= lastItemDate){
        list.shift();
      }
    }
    const appendList = list.length > 2 * this.config.lmt! ? list.slice(0, 2 * this.config.lmt!) : list;
    let newArrayList = [...this.arrayList, ...appendList];
    let newIndex = this.startIndex
    if(this.startIndex > 3 * this.config.lmt!){
      const minCount = this.startIndex - 2 * this.config.lmt!;
      newArrayList = newArrayList.slice(minCount, newArrayList.length);
      newIndex = newIndex - minCount;
    }
    this.arrayList = newArrayList;
    this.startIndex = newIndex;
  }
}
