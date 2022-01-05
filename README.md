### 步骤分析

用不用react其实d3的绘制步骤都是一致的，股票走势折线图的步骤主要为：

1. 获取数据
2. 生成svg画布，并确定尺寸边距
3. 坐标轴scale映射
4. 绘制数据线图
5. 绘制坐标轴
6. 绘制成交量柱子
7. 鼠标悬浮事件显示当日详情

### 获取数据

由于采用函数式组件，因此我们封装一个折线图组件，父组件获取数据，传给折线图组件数据后直接渲染。大致结构如下：

```js
function App() {
  const [priceData, setPriceData] = useState([]);
  useEffect(() => {
    fetch('dji.json', {
      headers : { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
       }

    })
    .then((response) => response.json())
    .then((messages) => {
      const data = messages.map(item => ({
        date: new Date(item[0]),
        high: item[4],
        low: item[3],
        open: item[1],
        close: item[2],
        volume: item[5]
      }));
      setPriceData(data)
    });
  }, [])
  return (
    <div className="App">
      <h1>DJI PRICE CHART</h1>
      <PriceChart
       data={ priceData }
      />
    </div>
  );
}

```

`dji.json`文件数据结构如下：

```json
[
  [
    "2004-01-02",
    10452.74,
    10409.85,
    10367.41,
    10554.96,
    168890000
  ],
  ...
]
```

### 生成svg画布，并确定尺寸边距

```js
  return (
    <div className='price-chart wrapper' ref={wrapperRef}>
      <svg ref={svgRef}>
        <g transform={`translate(${dimensions.marginLeft}, ${dimensions.marginTop})`}>
        </g>
      </svg>
    </div>
  )
```

这里习惯于用一个div来包裹svg，然后给svg设置百分百的宽高样式来获取实际宽高。

```js
  const wrapperRef = useRef();
  const svgRef = useRef();
  const dimensions = useResizeObserver(wrapperRef);
```

`useResizeObserver`是自定义`hook`，可以获取并监听容器的尺寸。之后我们就可以根据`data`和`dimensions`的变化来渲染折线图了，将其写入`useEffect`中。

```js
  useEffect(() => {
    if (!dimensions.width || !dimensions.height) return;
    // 获取svg画布
    const svg = select(svgRef.current);
    // 主体容器
    const gContainer = svg.select('g');
    // 主体容器宽高
    const { boundedWidth, boundedHeight } = dimensions;
  }, [data, dimensions])
```

`boundedWidth`和`boundedHeight`是数据线图实际的占据空间，留出上下左右的距离方便添加外围坐标轴等信息。

### 坐标轴scale映射

折线图只需要确定x、y轴的数据映射即可：

```js
    // x轴、y轴
    const xScale = scaleTime()
      .domain(extent(data, d => d.date))
      .range([0, boundedWidth])
      .nice();
    const yScale = scaleLinear()
      .domain(extent(data, d => d.close))
      .range([boundedHeight, 0])
      .nice();
```

### 绘制数据线图

然后根据上面的scale生成折线图：

```js
    // line生成器
    const lineGenerator = line()
      .x(d => xScale(d.date))
      .y(d => yScale(d.close));
    // 绘制line
    gContainer
      .selectAll(".line")
      .data([data])
      .join("path")
      .attr("class", "line")
      .attr("d", lineGenerator)
      .attr("fill", "none")
      .attr("stroke", "steelblue");
```

注意这里的.data方法是把整个数组传进去作为参数，join方法很重要，后面有更完整的用法。

### 绘制坐标轴

生成折线后，我们开始绘制外围坐标轴：

```js
    // 绘制x轴
    const xAxis = axisBottom(xScale);
    gContainer
      .select(".x-axis")
      .style("transform", `translateY(${boundedHeight}px)`)
      .call(xAxis);
    // 绘制y轴
    const yAxis = axisLeft(yScale);
    gContainer
      .select(".y-axis")
      .call(yAxis);
```

### 绘制成交量柱子

成交量这里其实就是个柱状图的生成，`xScale`复用，在写一个成交量的`yVolumeScale`即可，这里映射范围固定在y轴下面十分之一的范围。

```js
    // 成交量scale
    const yVolumeScale = scaleLinear()
      .domain(extent(data, d => d.volume))
      .range([boundedHeight, boundedHeight - boundedHeight / 10]);
    gContainer
      .selectAll('.volume')
      .data(data)
      .join('rect')
      .attr('class', 'volume')
      .attr('x', d => {
        return xScale(d['date']);
      })
      .attr('y', d => {
        return yVolumeScale(d['volume']);
      })
      .attr('fill', (d, i) => {
        if (i === 0) {
          return '#03a678';
        } else {
          return data[i - 1].close > d.close ? '#c0392b' : '#03a678';
        }
      })
      .attr('width', 1)
      .attr('height', d => {
        return boundedHeight - yVolumeScale(d['volume']);
      });
```

### 鼠标悬浮事件显示当日详情

最后我们需要添加交互事件，鼠标悬浮时候显示当日价格详情，这里主要参考了[Micah Stubb](https://bl.ocks.org/micahstubbs/e4f5c830c264d26621b80b754219ae1b)。

```js
    // 交互十字与信息面板
    const focus = gContainer
      .select('.focus')
      .style('display', 'none');
    focus.select('circle').attr('r', 4.5);
    gContainer
      .select('.overlay')
      .attr('width', boundedWidth)
      .attr('height', boundedHeight)
      .on('mouseover', () => focus.style('display', null))
      .on('mouseout', () => focus.style('display', 'none'))
      .on('mousemove', generateCrosshair);
    
    select('.overlay').style('fill', 'none')
    select('.overlay').style('pointer-events', 'all')


    selectAll('.focus line').style('fill', 'none');
    selectAll('.focus line').style('stroke', '#67809f');
    selectAll('.focus line').style('stroke-width', '1.5px');
    selectAll('.focus line').style('stroke-dasharray', '3 3');

    const bisectDate = bisector(d => d.date).left;
    function generateCrosshair() {
      //returns corresponding value from the domain
      const correspondingDate = xScale.invert(mouse(this)[0]);
      //gets insertion point
      const i = bisectDate(data, correspondingDate, 1);
      const d0 = data[i - 2 < 0 ? 0 : i - 2];
      const d1 = data[i - 1];
      const currentPoint = correspondingDate - d0['date'] > d1['date'] - correspondingDate ? d1 : d0;
      
      focus.attr('transform',`translate(${xScale(currentPoint['date'])}, ${yScale(currentPoint['close'])})`);
      focus
        .select('line.x')
        .attr('x1', 0)
        .attr('x2', boundedWidth - xScale(currentPoint['date']))
        .attr('y1', 0)
        .attr('y2', 0);
      focus
        .select('line.y')
        .attr('x1', 0)
        .attr('x2', 0)
        .attr('y1', 0)
        .attr('y2', boundedHeight - yScale(currentPoint['close']));
        updateLegends(currentPoint);
    }
    const updateLegends = currentData => {
      // selectAll('.lineLegend').remove();
      const legendKeys = Object.keys(data[0]);
      gContainer
        .selectAll('.lineLegend')
        .data(legendKeys)
        .join(
          enter => enter.append('g')
            .attr('class', 'lineLegend')
            .attr('transform', (d, i) => {
              return `translate(0, ${i * 20})`;
            })
            .append('text')
            .text(d => {
              if (d === 'date') {
                return `${d}: ${currentData[d].toLocaleDateString()}`;
              } else if ( d === 'high' || d === 'low' || d === 'open' || d === 'close') {
                return `${d}: ${currentData[d].toFixed(2)}`;
              } else {
                return `${d}: ${currentData[d]}`;
              }
            })
            .style('fill', 'white')
            .attr('transform', 'translate(15,9)'),
          update => update.select('text').text(d => {
            if (d === 'date') {
              return `${d}: ${currentData[d].toLocaleDateString()}`;
            } else if ( d === 'high' || d === 'low' || d === 'open' || d === 'close') {
              return `${d}: ${currentData[d].toFixed(2)}`;
            } else {
              return `${d}: ${currentData[d]}`;
            }
          })
        );
    };
```

这里的核心在于`d3.bisector`方法，确定鼠标浮动最近的价格时间点来获取当前数据点，然后显示十字虚线，并更新详情面板的价格。

`updateLegends`方法中展示了如何使用`join`方法，这样新增enter和更新update时候都可以处理相应的逻辑。

最后我们的折线图效果如下：

![image-20220105205156790](https://alee-picgo.oss-cn-shanghai.aliyuncs.com/img/20220105205204.png)

[详细代码](https://github.com/lijie33402/d3-react-price-chart)

### 思考

其实画这种简单的图表d3不算复杂，配合vue和react使用也就是封装一个组件使用，代码流程与逻辑基本一样，但是需要注意的是不能忽略框架的虚拟dom对比技术来提升性能，许多时候需要尽可能的事先将dom结构写好，采用d3的计算逻辑来渲染更新dom，我的另一个[demo示例](https://github.com/lijie33402/d3-react-examples)工程中有演示。