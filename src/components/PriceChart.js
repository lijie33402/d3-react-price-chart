import { useEffect, useRef } from 'react';
import './PriceChart.css';
import { useResizeObserver } from '../utils/hook';
import { select, scaleTime, scaleLinear, extent, line, axisBottom, axisLeft, selectAll, bisector, mouse } from 'd3';

function PriceChart({ data }) {
  console.log(data)
  const wrapperRef = useRef();
  const svgRef = useRef();
  const dimensions = useResizeObserver(wrapperRef)

  useEffect(() => {
    if (!dimensions.width || !dimensions.height) return;
    // 获取svg画布
    const svg = select(svgRef.current);
    // 主体容器
    const gContainer = svg.select('g');
    // 主体容器宽高
    const { boundedWidth, boundedHeight } = dimensions;
    // x轴、y轴
    const xScale = scaleTime()
      .domain(extent(data, d => d.date))
      .range([0, boundedWidth])
      .nice();
    const yScale = scaleLinear()
      .domain(extent(data, d => d.close))
      .range([boundedHeight, 0])
      .nice();
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
  }, [data, dimensions])

  return (
    <div className='price-chart wrapper' ref={wrapperRef}>
      <svg ref={svgRef}>
        <g transform={`translate(${dimensions.marginLeft}, ${dimensions.marginTop})`}>
          <g className="x-axis" />
          <g className="y-axis" />
          <g className='focus'>
            <circle></circle>
            <line className='x'></line>
            <line className='y'></line>
          </g>
          <rect className='overlay'></rect>
        </g>
      </svg>
    </div>
  )
}

export default PriceChart;