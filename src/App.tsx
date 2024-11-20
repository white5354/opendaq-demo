import './App.css'
import { useEffect, useRef, useState } from 'react'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent
} from 'echarts/components'
import {
  CanvasRenderer
} from 'echarts/renderers'

echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LineChart,
  CanvasRenderer
])

interface DataParams {
  data: [number, number]
  componentIndex: number
  seriesIndex: number
  seriesName: string
}

function App() {
  const [timeWindow, setTimeWindow] = useState(10000)
  const [amplitude, setAmplitude] = useState(10)
  const [showXSubScale, setShowXSubScale] = useState(false)
  const [showYSubScale, setShowYSubScale] = useState(false)
  const [xScaleDensity, setXScaleDensity] = useState(3)
  const [yScaleDensity, setYScaleDensity] = useState(3)
  const Y_AXIS_MAX = 10
  const Y_AXIS_MIN = -10
  const chartRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const startTime = useRef(Date.now())
  const dataRef = useRef<[number, number][]>([])
  const animationFrameRef = useRef<number>()
  const chartInstanceRef = useRef<echarts.ECharts>()

  // 修改绘制时间轴函数
  const drawTimeAxis = (ctx: CanvasRenderingContext2D, currentTime: number, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height)
    
    const offset = (currentTime % 2000) / 2000 * (width / 5)
    
    // 绘制水平线
    ctx.beginPath()
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 1
    ctx.moveTo(0, 0)
    ctx.lineTo(width, 0)
    ctx.stroke()

    // 如果启用横坐标子刻度，绘制更多的刻度线
    if (showXSubScale) {
      ctx.beginPath()
      ctx.strokeStyle = '#999'
      ctx.lineWidth = 0.5
      for (let i = 0; i < width; i += width / xScaleDensity) {
        const x = i - offset
        if (x >= 0 && x <= width) {
          ctx.moveTo(x, 0)
          ctx.lineTo(x, 3)
        }
      }
      ctx.stroke()
    }

    // 绘制刻度和时间标签
    ctx.font = '12px Arial'
    ctx.fillStyle = '#666'
    ctx.textAlign = 'center'
    
    // 绘制中间的时间标签
    for (let i = 0; i < 7; i++) {
      const x = i * (width / 5) - offset
      if (x >= 0 && x <= width) {
        // 绘制刻度线
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, 6)
        ctx.stroke()

        // 绘制时间标签
        const labelTime = new Date(currentTime - (timeWindow/1000 - i * (timeWindow/5000)) * 1000)
        const timeStr = `${labelTime.getHours().toString().padStart(2, '0')}:${
                        labelTime.getMinutes().toString().padStart(2, '0')}:${
                        labelTime.getSeconds().toString().padStart(2, '0')}.${
                        labelTime.getMilliseconds().toString().padStart(3, '0').slice(0, 2)}`
        ctx.fillText(timeStr, x, 20)
      }
    }

    // 绘制固定的开始和结束时间标记
    // 开始时间（10秒前）
    const startTime = new Date(currentTime - timeWindow)
    const endTime = new Date(currentTime)

    // 设置特殊样式
    ctx.fillStyle = '#333'
    ctx.font = 'bold 13px Arial'
    
    // 绘制开始时间
    ctx.textAlign = 'left'
    ctx.fillRect(0, 0, 2, 10) // 加粗的开始刻度线
    const startTimeStr = `${startTime.getHours().toString().padStart(2, '0')}:${
                         startTime.getMinutes().toString().padStart(2, '0')}:${
                         startTime.getSeconds().toString().padStart(2, '0')}.${
                         startTime.getMilliseconds().toString().padStart(3, '0').slice(0, 2)}`
    ctx.fillText(`[${startTimeStr}`, 4, 20)

    // 绘制结束时间
    ctx.textAlign = 'right'
    ctx.fillRect(width - 2, 0, 2, 10) // 加粗的结束刻度线
    const endTimeStr = `${endTime.getHours().toString().padStart(2, '0')}:${
                       endTime.getMinutes().toString().padStart(2, '0')}:${
                       endTime.getSeconds().toString().padStart(2, '0')}.${
                       endTime.getMilliseconds().toString().padStart(3, '0').slice(0, 2)}`
    ctx.fillText(`${endTimeStr}]`, width - 4, 20)

    // 添加半透明的背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
    ctx.fillRect(0, 0, 80, 25) // 左侧背景
    ctx.fillRect(width - 80, 0, 80, 25) // 右侧背景
  }

  // 修改处理密度输入的函数
  const handleDensityChange = (value: string, setter: (value: number) => void) => {
    // 允许空字符串输入
    if (value === '') {
      setter(0)
      return
    }

    const num = parseInt(value)
    // 只验证是否为数字，暂时不验证范围
    if (!isNaN(num)) {
      // 在设置值时验证范围
      const validNum = Math.max(0, Math.min(6, num))
      setter(validNum)
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    
    if (chartRef.current && canvas && ctx) {
      // 设置 Canvas 的尺寸
      const updateCanvasSize = () => {
        const container = canvas.parentElement
        if (container) {
          const { width, height } = container.getBoundingClientRect()
          const dpr = window.devicePixelRatio || 1
          canvas.width = width * dpr
          canvas.height = height * dpr
          canvas.style.width = `${width}px`
          canvas.style.height = `${height}px`
          ctx.scale(dpr, dpr)
        }
      }
      updateCanvasSize()

      const myChart = echarts.init(chartRef.current)
      chartInstanceRef.current = myChart
      
      const option = {
        title: {
          text: '实时正弦波形图'
        },
        tooltip: {
          trigger: 'axis',
          formatter: function(params: DataParams[]) {
            const [first] = params
            const date = new Date(first.data[0])
            return `时间: ${date.toLocaleTimeString()}.${date.getMilliseconds().toString().padStart(3, '0')}<br/>振幅: ${first.data[1].toFixed(2)}`
          }
        },
        xAxis: {
          show: false,
          type: 'time',
          min: startTime.current - timeWindow,
          max: startTime.current,
        },
        yAxis: {
          type: 'value',
          name: '振幅',
          min: Y_AXIS_MIN,
          max: Y_AXIS_MAX,
          axisLabel: {
            formatter: '{value}'
          },
          splitLine: {
            show: true,
            lineStyle: {
              type: showYSubScale ? 'solid' : 'dashed',
              color: '#ddd'
            }
          },
          minorTick: {
            show: showYSubScale,
            splitNumber: yScaleDensity,
          },
          minorSplitLine: {
            show: showYSubScale,
            lineStyle: {
              color: '#eee',
              width: 0.5
            }
          }
        },
        series: [
          {
            name: '正弦波',
            type: 'line',
            smooth: true,
            showSymbol: false,
            data: [],
            lineStyle: {
              width: 2
            },
            animation: false
          }
        ],
        grid: {
          left: '10%',
          right: '5%',
          bottom: '40px',
          top: '60px'
        }
      }

      myChart.setOption(option)

      const updateFrame = () => {
        const currentTime = Date.now()
        const elapsedTime = (currentTime - startTime.current) / 1000
        
        const newData: [number, number][] = []
        for (let t = -timeWindow/1000; t <= 0; t += 0.02) {
          const timestamp = currentTime + t * 1000
          if (t >= -elapsedTime) {
            const phase = (currentTime - startTime.current) / 1000
            const y = amplitude * Math.sin(2 * Math.PI * (t + phase) / 2)
            const clampedY = Math.max(Y_AXIS_MIN, Math.min(Y_AXIS_MAX, y))
            newData.push([timestamp, clampedY])
          }
        }
        
        dataRef.current = newData
        
        if (chartInstanceRef.current) {
          chartInstanceRef.current.setOption({
            xAxis: {
              min: currentTime - timeWindow,
              max: currentTime
            },
            yAxis: {
              min: Y_AXIS_MIN,
              max: Y_AXIS_MAX
            },
            series: [{
              data: dataRef.current
            }]
          })
        }

        // 绘制时间轴
        if (canvas && ctx) {
          drawTimeAxis(ctx, currentTime, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio)
        }

        animationFrameRef.current = requestAnimationFrame(updateFrame)
      }

      animationFrameRef.current = requestAnimationFrame(updateFrame)

      const resizeHandler = () => {
        myChart.resize()
        updateCanvasSize()
      }
      window.addEventListener('resize', resizeHandler)

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
        window.removeEventListener('resize', resizeHandler)
        myChart.dispose()
      }
    }
  }, [timeWindow, amplitude, showXSubScale, showYSubScale, xScaleDensity, yScaleDensity])

  return (
    <div className="chart-container">
      <div className="controls">
        <div className="control-group">
          <span>时间窗口：</span>
          <select 
            value={timeWindow} 
            onChange={(e) => setTimeWindow(Number(e.target.value))}
            className="control-select"
          >
            <option value={5000}>5秒</option>
            <option value={10000}>10秒</option>
            <option value={30000}>30秒</option>
            <option value={60000}>1分钟</option>
          </select>
        </div>
        <div className="control-group">
          <span>振幅：</span>
          <select
            value={amplitude}
            onChange={(e) => setAmplitude(Number(e.target.value))}
            className="control-select"
          >
            <option value={2}>2</option>
            <option value={4}>4</option>
            <option value={6}>6</option>
            <option value={8}>8</option>
            <option value={10}>10</option>
          </select>
        </div>
        <div className="control-scales">
          <div className="scale-control">
            <label className="control-checkbox">
              <input
                type="checkbox"
                checked={showXSubScale}
                onChange={(e) => setShowXSubScale(e.target.checked)}
              />
              <span>X轴子刻度</span>
            </label>
            {showXSubScale && (
              <div className="density-input-group">
                <span>密度:</span>
                <input
                  type="number"
                  min="0"
                  max="6"
                  value={xScaleDensity}
                  onChange={(e) => handleDensityChange(e.target.value, setXScaleDensity)}
                  onBlur={(e) => {
                    // 在失去焦点时确保值在有效范围内
                    const num = parseInt(e.target.value)
                    if (isNaN(num) || num < 0) {
                      setXScaleDensity(0)
                    } else if (num > 6) {
                      setXScaleDensity(6)
                    }
                  }}
                  className="density-input"
                />
              </div>
            )}
          </div>
          <div className="scale-control">
            <label className="control-checkbox">
              <input
                type="checkbox"
                checked={showYSubScale}
                onChange={(e) => setShowYSubScale(e.target.checked)}
              />
              <span>Y轴子刻度</span>
            </label>
            {showYSubScale && (
              <div className="density-input-group">
                <span>密度:</span>
                <input
                  type="number"
                  min="0"
                  max="6"
                  value={yScaleDensity}
                  onChange={(e) => handleDensityChange(e.target.value, setYScaleDensity)}
                  onBlur={(e) => {
                    // 在失去焦点时确保值在有效范围内
                    const num = parseInt(e.target.value)
                    if (isNaN(num) || num < 0) {
                      setYScaleDensity(0)
                    } else if (num > 6) {
                      setYScaleDensity(6)
                    }
                  }}
                  className="density-input"
                />
              </div>
            )}
          </div>
        </div>
      </div>
      <div ref={chartRef} className="echarts-container"></div>
      <div className="time-axis">
        <canvas ref={canvasRef}></canvas>
      </div>
    </div>
  )
}

export default App
