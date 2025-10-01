import { stockItemData } from './common';
import kline from './kline';

export class touchPan {
  private klineChart: any;
  private canvasCxt: any;
  private parentLeft: number = 0;
  private parentTop: number = 0;
  private timeOut: any;
  private callbackFun?: (item: stockItemData) => void;

  private longPressTimer: any;
  private startX: number = 0;
  private isLongPress: boolean = false;

  private lastArrayStartIndex: number = 0;

  constructor(klineObject: kline, callback?: (item: stockItemData) => void) {
    this.klineChart = klineObject;
    this.callbackFun = callback;

    const dpr = window.devicePixelRatio || 1;
    const canvas: any = document.getElementById(this.klineChart.config.touchPanCanvasId);
    canvas.width = (this.klineChart.config.width + 1) * dpr;
    canvas.height = (this.klineChart.config.height + 1) * dpr;
    canvas.style.height = this.klineChart.config.height + 1 + 'px';
    canvas.style.width = this.klineChart.config.width + 1 + 'px';
    this.canvasCxt = canvas.getContext('2d');
    this.canvasCxt.translate(0.5, 0.5);
    this.canvasCxt.scale(dpr, dpr);

    const rect = canvas.getBoundingClientRect();
    this.parentLeft = rect.left;
    this.parentTop = rect.top;
  }

  //初始化并添加监听事件
  init() {
    const width = this.klineChart.config.width;
    const height = this.klineChart.config.height;

    document.getElementById('canvasTop')?.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    document.getElementById('canvasTop')?.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.lastArrayStartIndex = this.klineChart.startIndex;
      this.canvasCxt.clearRect(0, 0, width, height);
      this.startX = e.touches[0].clientX;
      this.isLongPress = false;
      this.longPressTimer = setTimeout(() => {
        this.isLongPress = true;
        this.showCrossHair(e);
      }, 500);
    });

    document.getElementById('canvasTop')?.addEventListener('touchmove', (e) => {
      if (this.isLongPress) {
        //长按移动时更新十字光标位置
        this.showCrossHair(e);
      } else {
        //快按拖动时移动K线图
        clearTimeout(this.longPressTimer);
        this.moveKLineChart(e);
      }
    });

    document.getElementById('canvasTop')?.addEventListener('touchend', () => {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
      }
      if (this.isLongPress) {
        if (this.timeOut) {
          clearTimeout(this.timeOut);
        }
        this.timeOut = setTimeout(() => {
          this.canvasCxt.clearRect(0, 0, width, height);
        }, 1000);
      }
      this.isLongPress = false;
      this.klineChart.tryFetchData();
    });
  }

  //拖动K线图的效果
  private moveKLineChart(e: any) {
    //灵敏系数，避免拖动幅度很小，但是拖动距离却很大，会让用户感觉不好控制
    const xishu = 0.8;
    const offsetX = (e.touches[0].clientX - this.startX) * xishu;
    this.klineChart.slideOffsetX(this.lastArrayStartIndex, offsetX);
  }

  //显示hover的效果
  private showCrossHair(e: any) {
    const width = this.klineChart.config.width;
    const height = this.klineChart.config.height;
    const { clientX, clientY } = e.touches[0];
    if (
      clientX < this.parentLeft ||
      clientY < this.parentTop + this.klineChart.config.lineMessageHeight
    ) {
      this.canvasCxt.clearRect(-1, -1, width + 1, height + 1);
      return;
    }
    if (
      clientX > this.parentLeft + width ||
      clientY > this.parentTop + height - this.klineChart.config.xLabelHeight
    ) {
      this.canvasCxt.clearRect(-1, -1, width + 1, height + 1);
      return;
    }
    const x = clientX - this.parentLeft;
    const y = clientY - this.parentTop;
    if (this.klineChart) {
      const result = this.klineChart.getItemInfo(x, y);
      if (result) {
        this.drawCross(x, y, result);
      }
    }
  }

  //画出十字交叉线
  private drawCross(x: number, y: number, info: any) {
    //整个canvas的宽度
    const width = this.klineChart.config.width;
    //整个canvas的高度
    const height = this.klineChart.config.height;
    //字体大小
    const xLabelFontSize = this.klineChart.config.xLabelFontSize;
    const yLabelFontSize = this.klineChart.config.yLabelFontSize;
    //交叉线颜色
    const crossLineColor = this.klineChart.config.crossLineColor;
    //canvas顶部均线信息区的高度
    const lineMessageHeight = this.klineChart.config.lineMessageHeight;
    //x轴信息区的高度
    const xLabelHeight = this.klineChart.config.xLabelHeight;
    //整一屏柱体的个数
    const lmt = this.klineChart.config.lmt;
    //tooltip字体的颜色
    const yLabelColor = this.klineChart.config.yLabelColor;
    //tooltip字体的颜色
    const xLabelColor = this.klineChart.config.xLabelColor;
    //x轴标签的背景颜色
    const xLabelToolTipColor = this.klineChart.config.xLabelToolTipColor;
    //y轴标签的背景颜色
    const yLabelToolTipColor = this.klineChart.config.yLabelToolTipColor;

    //每一个柱体占用的宽度
    const splitW = width / lmt;
    //在柱体正中间的竖线对应的x轴的值
    const middleX = Math.floor((Math.floor(x / splitW) + 0.5) * splitW);
    //获取到该柱体的具体信息
    const { item } = info;

    this.canvasCxt.clearRect(-1, -1, width + 2, height + 2);
    //先将均线信息画出来
    this.updateText(item);
    this.canvasCxt.beginPath();
    this.canvasCxt.strokeStyle = crossLineColor;
    this.canvasCxt.lineWidth = 1;
    this.canvasCxt.beginPath();

    //画出横线, 当info.yLabel为空白时，表示横线在主图和幅图之间，此时横线可以不画
    if (info.yLabel) {
      this.canvasCxt.moveTo(0, Math.floor(y));
      this.canvasCxt.lineTo(Math.floor(width), Math.floor(y));
      this.canvasCxt.stroke();
    }

    //画出竖线
    this.canvasCxt.moveTo(Math.floor(x), lineMessageHeight);
    this.canvasCxt.lineTo(Math.floor(x), Math.floor(height - xLabelHeight));
    this.canvasCxt.stroke();

    //画出时间
    this.canvasCxt.beginPath();
    this.canvasCxt.font = `${xLabelFontSize}px Arial`;
    this.canvasCxt.textBaseline = 'alphabetic';
    this.canvasCxt.fillStyle = xLabelToolTipColor;
    const text = '\n\n' + item.date + '\n\n';
    const textWidth = Math.floor(this.canvasCxt.measureText(text).width);
    const textHeight = Math.floor(xLabelFontSize * 1.6);

    //xlabel为tooltip左上角对应X轴的坐标
    let xlabel = Math.floor(middleX - textWidth / 2);
    if (xlabel < 0) {
      //限制不为负数，以免遮挡
      xlabel = 0;
    } else if (xlabel > width - textWidth) {
      //限制越界，以免遮挡
      xlabel = Math.floor(width - textWidth);
    }

    //将时间文字和背景色画出来
    this.canvasCxt.fillRect(
      xlabel,
      Math.floor(height - xLabelHeight + (xLabelHeight - textHeight) / 2),
      textWidth,
      textHeight,
    );
    this.canvasCxt.beginPath();
    this.canvasCxt.fillStyle = xLabelColor;
    this.canvasCxt.textBaseline = 'middle';
    this.canvasCxt.fillText(text, xlabel, Math.floor(height - xLabelHeight / 2) + 1);

    //当info.yLabel为空白时，表示横线在主图和幅图之间，此时横线可以不画，对应的股票价格tooltip也可以不画
    if (!info.yLabel) {
      return;
    }

    //股价（或者成交量）是否显示在左边
    const isLeft = x >= width / 2;
    //浮层高度
    const tooltipHeight = Math.floor(yLabelFontSize * 1.5);
    //浮层左上角的y值
    let yTop = y - tooltipHeight / 2;

    if (yTop < lineMessageHeight) {
      //顶部限制，避免越界被遮挡
      yTop = lineMessageHeight;
    } else if (yTop > height - xLabelHeight - tooltipHeight) {
      //底部限制，避免越界被遮挡
      yTop = Math.floor(height - xLabelHeight - tooltipHeight);
    } else if (y < lineMessageHeight + this.klineChart.mainChartHeight) {
      //主图的底部也限制，避免越界遮挡
      if (y + tooltipHeight / 2 > lineMessageHeight + this.klineChart.mainChartHeight) {
        yTop = lineMessageHeight + this.klineChart.mainChartHeight - tooltipHeight;
      }
    } else if (y > height - xLabelHeight - this.klineChart.subChartHeight) {
      //幅图的顶部也限制，避免越界遮挡
      if (y - tooltipHeight / 2 < height - xLabelHeight - this.klineChart.subChartHeight) {
        yTop = Math.floor(height - xLabelHeight - this.klineChart.subChartHeight);
      }
    }
    yTop = Math.floor(yTop);

    //画出tooltip背景色
    this.canvasCxt.beginPath();
    this.canvasCxt.fillStyle = yLabelToolTipColor;
    const valueText = '\n' + info.yLabel + '\n';
    //浮层宽度
    const tooltipWidth = Math.floor(this.canvasCxt.measureText(valueText).width);
    if (isLeft) {
      this.canvasCxt.fillRect(0, yTop, tooltipWidth, tooltipHeight);
    } else {
      this.canvasCxt.fillRect(width - tooltipWidth, yTop, tooltipWidth, tooltipHeight);
    }

    //画出tooltip文字
    this.canvasCxt.beginPath();
    this.canvasCxt.fillStyle = yLabelColor;
    this.canvasCxt.textBaseline = 'middle';
    //字体居中的时候y轴的值
    const textY = Math.floor(yTop + 0.5 * tooltipHeight) + 1;
    if (isLeft) {
      this.canvasCxt.fillText(valueText, 0, textY);
    } else {
      this.canvasCxt.fillText(valueText, width - tooltipWidth, textY);
    }

    //回调，展示该天的股票信息
    if (this.callbackFun) {
      this.callbackFun(item);
    }
  }

  //将成交量、均线等信息画出来
  private updateText(item: stockItemData) {
    const lineMessageHeight = this.klineChart.config.lineMessageHeight;
    const xLabelColor = this.klineChart.config.xLabelColor;
    const ma10Color = this.klineChart.config.ma10Color;
    const ma20Color = this.klineChart.config.ma20Color;
    const cma1Color = this.klineChart.config.cma1Color;
    const cma2Color = this.klineChart.config.cma2Color;
    const tradeMessageHeight = this.klineChart.config.tradeMessageHeight;
    const mainChartHeight = this.klineChart.mainChartHeight;
    const bgColor = this.klineChart.config.bgColor;
    const width = this.klineChart.config.width;
    const xLabelFontSize = this.klineChart.config.xLabelFontSize;

    this.canvasCxt.beginPath();
    this.canvasCxt.fillStyle = bgColor;
    this.canvasCxt.fillRect(1, 1, width - 2, lineMessageHeight - 2);
    this.canvasCxt.fillRect(
      1,
      lineMessageHeight + mainChartHeight + 1,
      width - 2,
      tradeMessageHeight - 2,
    );

    this.canvasCxt.beginPath();
    this.canvasCxt.font = `${xLabelFontSize}px "Segoe UI", Arial, sans-serif`;

    //头部的均线标签
    const lineMessageHeightY = Math.floor(lineMessageHeight / 2 + 1);
    this.canvasCxt.textAlign = 'left';
    this.canvasCxt.textBaseline = 'middle';
    this.canvasCxt.fillStyle = xLabelColor;
    const htext1 = ` 均线 MA5:${item.ju5.toFixed(2)}  `;
    this.canvasCxt.fillText(htext1, 0, lineMessageHeightY);

    const htext1width = Math.floor(this.canvasCxt.measureText(htext1).width);
    const htext2 = ` MA10:${item.ju10.toFixed(2)}  `;
    this.canvasCxt.fillStyle = ma10Color;
    this.canvasCxt.fillText(htext2, htext1width, lineMessageHeightY);

    const htext2width = Math.floor(this.canvasCxt.measureText(htext2).width);
    const htext3 = ` MA20:${item.ju20.toFixed(2)}  `;
    this.canvasCxt.fillStyle = ma20Color;
    this.canvasCxt.fillText(htext3, htext1width + htext2width, lineMessageHeightY);

    //画一下成交量的文字
    const tY = Math.floor(lineMessageHeight + mainChartHeight + tradeMessageHeight / 2) + 1;
    const text1 = ` 成交量 ${this.getAmount(item.zs)}  `;
    this.canvasCxt.fillStyle = xLabelColor;
    this.canvasCxt.fillText(text1, 0, tY);

    const text1width = Math.floor(this.canvasCxt.measureText(text1).width);
    const text2 = ` MA1: ${this.getAmount(item.ma1)}  `;
    this.canvasCxt.fillStyle = cma1Color;
    this.canvasCxt.fillText(text2, text1width, tY);

    const text2width = Math.floor(this.canvasCxt.measureText(text2).width);
    const text3 = ` MA2: ${this.getAmount(item.ma2)}  `;
    this.canvasCxt.fillStyle = cma2Color;
    this.canvasCxt.fillText(text3, text1width + text2width, tY);
  }

  //成交量的单位换算
  private getAmount(value: number) {
    if (value > 1e8) {
      return (value / 1e8).toFixed(2) + '亿';
    }
    if (value > 1e4) {
      return (value / 1e4).toFixed(1) + '万';
    }
    return (value / 1).toFixed(0);
  }
}
