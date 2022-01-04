import { useEffect, useRef } from 'react';
import './PriceChart.css';
import { useResizeObserver } from '../utils/hook';
import { select, scaleTime, scaleLinear, extent, line, axisBottom, axisLeft, axisRight } from 'd3';

function PriceChart({data}) {
  console.log('render pricechart', data)
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
  }, [data, dimensions])

  return (
    <div className='price-chart wrapper' ref={wrapperRef}>
      <svg ref={svgRef}>
        <g transform={`translate(${dimensions.marginLeft}, ${dimensions.marginTop})`}>
          <g className="x-axis" />
          <g className="y-axis" />
        </g>
      </svg>
    </div>
  )
}

export default PriceChart;