"""
图表生成服务
负责使用 Plotly 生成各种类型的图表并输出为 PNG/SVG 格式
"""
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import pandas as pd
import numpy as np
import base64
import io
from typing import Dict, List, Any, Optional, Tuple, Union
import logging
from pathlib import Path
import json

logger = logging.getLogger(__name__)

class ChartGenerator:
    """图表生成器"""
    
    def __init__(self):
        """初始化图表生成器"""
        self.supported_chart_types = {
            'bar': self._generate_bar_chart,
            'line': self._generate_line_chart,
            'pie': self._generate_pie_chart,
            'scatter': self._generate_scatter_chart,
            'area': self._generate_area_chart,
            'heatmap': self._generate_heatmap_chart,
            'box': self._generate_box_chart,
            'violin': self._generate_violin_chart,
            'histogram': self._generate_histogram_chart
        }
        
        # 默认图表配置
        self.default_config = {
            'displayModeBar': False,
            'displaylogo': False,
            'modeBarButtonsToRemove': ['pan2d', 'lasso2d', 'select2d'],
            'responsive': True
        }
        
        # 默认布局配置
        self.default_layout = {
            'font': {
                'family': 'Arial, sans-serif',
                'size': 12
            },
            'paper_bgcolor': 'rgba(0,0,0,0)',  # 透明背景
            'plot_bgcolor': 'rgba(0,0,0,0)',   # 透明背景
            'margin': dict(l=50, r=50, t=50, b=50),
            'showlegend': True,
            'legend': dict(
                orientation="h",
                yanchor="bottom",
                y=1.02,
                xanchor="right",
                x=1
            )
        }
    
    def generate_chart(self, 
                      data: Dict[str, Any], 
                      chart_type: str = 'bar',
                      title: str = "数据图表",
                      width: int = 800,
                      height: int = 600,
                      format: str = 'png') -> Dict[str, Any]:
        """
        生成图表
        
        Args:
            data: 图表数据
            chart_type: 图表类型
            title: 图表标题
            width: 图表宽度
            height: 图表高度
            format: 输出格式 ('png' 或 'svg')
            
        Returns:
            生成结果
        """
        try:
            # 验证图表类型
            if chart_type not in self.supported_chart_types:
                raise ValueError(f"不支持的图表类型: {chart_type}")
            
            # 转换Excel数据格式到图表生成器格式
            converted_data = self._convert_excel_data_to_chart_format(data)
            
            # 生成图表（不包含标题，标题在主布局中设置）
            fig = self.supported_chart_types[chart_type](converted_data, "")
            
            # 应用默认布局（包含尺寸和标题）
            layout_config = self.default_layout.copy()
            layout_config.update({
                'width': width,
                'height': height,
                'title': title
            })
            fig.update_layout(**layout_config)
            
            # 根据格式输出
            if format.lower() == 'png':
                image_data = self._convert_to_png(fig, width, height)
                mime_type = 'image/png'
            elif format.lower() == 'svg':
                image_data = self._convert_to_svg(fig, width, height)
                mime_type = 'image/svg+xml'
            else:
                raise ValueError(f"不支持的输出格式: {format}")
            
            return {
                'success': True,
                'message': '图表生成成功',
                'image_data': image_data,
                'mime_type': mime_type,
                'chart_type': chart_type,
                'width': width,
                'height': height,
                'format': format,
                'title': title
            }
            
        except Exception as e:
            logger.error(f"图表生成失败: {e}")
            return {
                'success': False,
                'message': f'图表生成失败: {str(e)}',
                'error': str(e)
            }
    
    def _generate_bar_chart(self, data: Dict[str, Any], title: str) -> go.Figure:
        """生成柱状图"""
        chart_data = data.get('data', [])
        columns = data.get('columns', [])
        
        if not chart_data or not columns:
            raise ValueError("数据格式错误")
        
        # 确定标签和数值列
        if len(columns) >= 2:
            label_col = columns[0]
            value_col = columns[1]
        else:
            label_col = 'label'
            value_col = 'value'
        
        # 提取数据
        labels = [item.get(label_col, item.get('label', '')) for item in chart_data]
        values = [item.get(value_col, item.get('value', 0)) for item in chart_data]
        
        # 创建柱状图
        fig = go.Figure(data=[
            go.Bar(
                x=labels,
                y=values,
                marker_color='rgba(55, 128, 191, 0.7)',
                marker_line_color='rgba(55, 128, 191, 1.0)',
                marker_line_width=2,
                text=[f'{val}' for val in values],
                textposition='auto',
            )
        ])
        
        # 设置坐标轴标题但不调用update_layout（避免覆盖主布局设置）
        fig.update_xaxes(title=label_col)
        fig.update_yaxes(title=value_col)
        
        return fig
    
    def _generate_line_chart(self, data: Dict[str, Any], title: str) -> go.Figure:
        """生成折线图"""
        chart_data = data.get('data', [])
        columns = data.get('columns', [])
        
        if not chart_data or not columns:
            raise ValueError("数据格式错误")
        
        if len(columns) >= 2:
            x_col = columns[0]
            y_col = columns[1]
        else:
            x_col = 'x'
            y_col = 'y'
        
        # 提取数据
        x_values = [item.get(x_col, item.get('label', '')) for item in chart_data]
        y_values = [item.get(y_col, item.get('value', 0)) for item in chart_data]
        
        # 创建折线图
        fig = go.Figure(data=[
            go.Scatter(
                x=x_values,
                y=y_values,
                mode='lines+markers',
                line=dict(color='rgba(55, 128, 191, 1)', width=3),
                marker=dict(size=8, color='rgba(55, 128, 191, 1)'),
                text=[f'{x}: {y}' for x, y in zip(x_values, y_values)],
                hoverinfo='text'
            )
        ])
        
        # 设置坐标轴标题但不调用update_layout（避免覆盖主布局设置）
        fig.update_xaxes(title=x_col)
        fig.update_yaxes(title=y_col)
        fig.update_layout(hovermode='x unified')
        
        return fig
    
    def _generate_pie_chart(self, data: Dict[str, Any], title: str) -> go.Figure:
        """生成饼图"""
        chart_data = data.get('data', [])
        columns = data.get('columns', [])
        
        if not chart_data or not columns:
            raise ValueError("数据格式错误")
        
        if len(columns) >= 2:
            label_col = columns[0]
            value_col = columns[1]
        else:
            label_col = 'label'
            value_col = 'value'
        
        # 提取数据
        labels = [item.get(label_col, item.get('label', '')) for item in chart_data]
        values = [item.get(value_col, item.get('value', 0)) for item in chart_data]
        
        # 创建饼图
        fig = go.Figure(data=[
            go.Pie(
                labels=labels,
                values=values,
                textinfo='label+percent',
                textposition='auto',
                marker=dict(
                    line=dict(color='#000000', width=2)
                ),
                hovertemplate='<b>%{label}</b><br>数值: %{value}<br>占比: %{percent}<extra></extra>'
            )
        ])
        
        # 饼图不需要设置坐标轴标题，但需要保持图例显示
        # showlegend 已在 default_layout 中设置
        
        return fig
    
    def _generate_scatter_chart(self, data: Dict[str, Any], title: str) -> go.Figure:
        """生成散点图"""
        chart_data = data.get('data', [])
        columns = data.get('columns', [])
        
        if not chart_data or not columns:
            raise ValueError("数据格式错误")
        
        if len(columns) >= 2:
            x_col = columns[0]
            y_col = columns[1]
        else:
            x_col = 'x'
            y_col = 'y'
        
        # 提取数据
        x_values = [item.get(x_col, item.get('label', 0)) for item in chart_data]
        y_values = [item.get(y_col, item.get('value', 0)) for item in chart_data]
        
        # 创建散点图
        fig = go.Figure(data=[
            go.Scatter(
                x=x_values,
                y=y_values,
                mode='markers',
                marker=dict(
                    size=10,
                    color='rgba(55, 128, 191, 0.7)',
                    line=dict(width=2, color='rgba(55, 128, 191, 1)')
                ),
                text=[f'{x}, {y}' for x, y in zip(x_values, y_values)],
                hoverinfo='text'
            )
        ])
        
        # 设置坐标轴标题但不调用update_layout（避免覆盖主布局设置）
        fig.update_xaxes(title=x_col)
        fig.update_yaxes(title=y_col)
        
        return fig
    
    def _generate_area_chart(self, data: Dict[str, Any], title: str) -> go.Figure:
        """生成面积图"""
        chart_data = data.get('data', [])
        columns = data.get('columns', [])
        
        if not chart_data or not columns:
            raise ValueError("数据格式错误")
        
        if len(columns) >= 2:
            x_col = columns[0]
            y_col = columns[1]
        else:
            x_col = 'x'
            y_col = 'y'
        
        # 提取数据
        x_values = [item.get(x_col, item.get('label', '')) for item in chart_data]
        y_values = [item.get(y_col, item.get('value', 0)) for item in chart_data]
        
        # 创建面积图
        fig = go.Figure(data=[
            go.Scatter(
                x=x_values,
                y=y_values,
                fill='tozeroy',
                mode='lines',
                line=dict(color='rgba(55, 128, 191, 1)', width=3),
                fillcolor='rgba(55, 128, 191, 0.3)'
            )
        ])
        
        # 设置坐标轴标题但不调用update_layout（避免覆盖主布局设置）
        fig.update_xaxes(title=x_col)
        fig.update_yaxes(title=y_col)
        
        return fig
    
    def _generate_heatmap_chart(self, data: Dict[str, Any], title: str) -> go.Figure:
        """生成热力图"""
        # 尝试从数据中提取矩阵格式
        if 'matrix' in data:
            z_values = data['matrix']
            x_labels = data.get('x_labels', list(range(len(z_values[0]))))
            y_labels = data.get('y_labels', list(range(len(z_values))))
        else:
            # 如果不是矩阵格式，尝试转换为相关系数矩阵
            chart_data = data.get('data', [])
            if not chart_data:
                raise ValueError("热力图需要矩阵数据")
            
            # 创建数值矩阵
            numeric_data = []
            for item in chart_data:
                row = []
                for key, value in item.items():
                    if isinstance(value, (int, float)):
                        row.append(value)
                if row:
                    numeric_data.append(row)
            
            if not numeric_data:
                raise ValueError("无法提取数值数据用于热力图")
            
            z_values = numeric_data
            x_labels = data.get('columns', list(range(len(z_values[0]))))
            y_labels = list(range(len(z_values)))
        
        # 创建热力图
        fig = go.Figure(data=go.Heatmap(
            z=z_values,
            x=x_labels,
            y=y_labels,
            colorscale='Viridis',
            hoverongaps=False
        ))
        
        # 标题已在主布局中设置
        return fig
    
    def _generate_box_chart(self, data: Dict[str, Any], title: str) -> go.Figure:
        """生成箱线图"""
        chart_data = data.get('data', [])
        columns = data.get('columns', [])
        
        if not chart_data or not columns:
            raise ValueError("数据格式错误")
        
        # 提取数值列
        numeric_columns = []
        for col in columns[1:]:  # 跳过第一列（通常是标签）
            values = [item.get(col, 0) for item in chart_data if isinstance(item.get(col), (int, float))]
            if values:
                numeric_columns.append((col, values))
        
        if not numeric_columns:
            raise ValueError("没有找到数值数据")
        
        # 创建箱线图
        fig = go.Figure()
        for col_name, values in numeric_columns:
            fig.add_trace(go.Box(y=values, name=col_name))
        
        # 设置Y轴标题
        fig.update_yaxes(title='数值')
        return fig
    
    def _generate_violin_chart(self, data: Dict[str, Any], title: str) -> go.Figure:
        """生成小提琴图"""
        chart_data = data.get('data', [])
        columns = data.get('columns', [])
        
        if not chart_data or not columns:
            raise ValueError("数据格式错误")
        
        # 提取数值列
        numeric_columns = []
        for col in columns[1:]:  # 跳过第一列（通常是标签）
            values = [item.get(col, 0) for item in chart_data if isinstance(item.get(col), (int, float))]
            if values:
                numeric_columns.append((col, values))
        
        if not numeric_columns:
            raise ValueError("没有找到数值数据")
        
        # 创建小提琴图
        fig = go.Figure()
        for col_name, values in numeric_columns:
            fig.add_trace(go.Violin(y=values, name=col_name))
        
        # 设置Y轴标题
        fig.update_yaxes(title='数值')
        return fig
    
    def _generate_histogram_chart(self, data: Dict[str, Any], title: str) -> go.Figure:
        """生成直方图"""
        chart_data = data.get('data', [])
        columns = data.get('columns', [])
        
        if not chart_data or not columns:
            raise ValueError("数据格式错误")
        
        # 提取数值数据
        all_values = []
        for item in chart_data:
            for value in item.values():
                if isinstance(value, (int, float)):
                    all_values.append(value)
        
        if not all_values:
            raise ValueError("没有找到数值数据")
        
        # 创建直方图
        fig = go.Figure(data=[go.Histogram(x=all_values, nbinsx=20)])
        # 设置坐标轴标题
        fig.update_xaxes(title='数值')
        fig.update_yaxes(title='频次')
        return fig
    
    def _convert_excel_data_to_chart_format(self, excel_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        将Excel解析数据转换为图表生成器可用的格式
        
        Args:
            excel_data: Excel解析器返回的数据
            
        Returns:
            转换后的图表数据格式
        """
        try:
            # 如果数据已经是正确的格式，直接返回
            if 'data' in excel_data and 'columns' in excel_data:
                return excel_data
            
            # 从Excel解析结果中提取数据
            chart_info = excel_data.get('chart_data', {})
            raw_data = chart_info.get('raw_data', {})
            
            # 获取列名和数据
            columns = raw_data.get('columns', [])
            data_rows = raw_data.get('data', [])
            
            if not columns or not data_rows:
                raise ValueError("Excel数据格式不正确")
            
            # 转换为图表生成器格式
            chart_data = []
            for row in data_rows:
                row_dict = {}
                for i, value in enumerate(row):
                    if i < len(columns):
                        row_dict[columns[i]] = value
                chart_data.append(row_dict)
            
            return {
                'data': chart_data,
                'columns': columns,
                'raw_data': raw_data
            }
            
        except Exception as e:
            logger.error(f"数据格式转换失败: {e}")
            raise ValueError(f"数据格式转换失败: {str(e)}")
    
    def _convert_to_png(self, fig: go.Figure, width: int, height: int) -> str:
        """转换为 PNG 格式 (Base64)"""
        try:
            # 转换为 PNG，直接指定尺寸
            img_bytes = fig.to_image(format="png", width=width, height=height)
            img_base64 = base64.b64encode(img_bytes).decode('utf-8')
            
            return f"data:image/png;base64,{img_base64}"
            
        except Exception as e:
            logger.error(f"PNG 转换失败: {e}")
            raise RuntimeError(f"PNG 转换失败: {str(e)}")
    
    def _convert_to_svg(self, fig: go.Figure, width: int, height: int) -> str:
        """转换为 SVG 格式"""
        try:
            # 转换为 SVG，直接指定尺寸
            img_bytes = fig.to_image(format="svg", width=width, height=height)
            img_str = img_bytes.decode('utf-8')
            
            return f"data:image/svg+xml;base64,{base64.b64encode(img_str.encode('utf-8')).decode('utf-8')}"
            
        except Exception as e:
            logger.error(f"SVG 转换失败: {e}")
            raise RuntimeError(f"SVG 转换失败: {str(e)}")
    
    def suggest_chart_type(self, data: Dict[str, Any]) -> List[str]:
        """
        根据数据特征建议图表类型
        
        Args:
            data: 数据字典
            
        Returns:
            建议的图表类型列表
        """
        try:
            chart_data = data.get('data', [])
            columns = data.get('columns', [])
            
            if not chart_data or not columns:
                return ['bar']  # 默认建议
            
            # 分析数据特征
            numeric_columns = 0
            text_columns = 0
            unique_labels = set()
            
            for col in columns:
                # 检查列的数据类型
                sample_values = [item.get(col) for item in chart_data[:10]]
                numeric_count = sum(1 for v in sample_values if isinstance(v, (int, float)))
                
                if numeric_count > len(sample_values) * 0.7:  # 70% 以上是数值
                    numeric_columns += 1
                else:
                    text_columns += 1
                    unique_labels.update(sample_values)
            
            # 根据特征建议图表类型
            suggestions = []
            
            if text_columns == 1 and numeric_columns == 1:
                # 单分类单数值：适合柱状图、饼图、折线图
                suggestions.extend(['bar', 'pie', 'line'])
            elif text_columns == 1 and numeric_columns > 1:
                # 单分类多数值：适合柱状图、折线图、面积图
                suggestions.extend(['bar', 'line', 'area'])
            elif numeric_columns >= 2:
                # 多数值：适合散点图、热力图
                suggestions.extend(['scatter', 'heatmap'])
            elif numeric_columns == 1:
                # 单数值：适合直方图、箱线图
                suggestions.extend(['histogram', 'box'])
            
            # 添加通用建议
            if 'bar' not in suggestions:
                suggestions.append('bar')
            
            return suggestions[:5]  # 返回前5个建议
            
        except Exception as e:
            logger.error(f"图表类型建议失败: {e}")
            return ['bar']  # 默认建议
    
    def optimize_chart_size(self, data: Dict[str, Any], chart_type: str) -> Tuple[int, int]:
        """
        根据数据量和图表类型优化图表尺寸
        
        Args:
            data: 数据字典
            chart_type: 图表类型
            
        Returns:
            优化的 (宽度, 高度)
        """
        try:
            chart_data = data.get('data', [])
            data_size = len(chart_data)
            
            # 根据数据量调整尺寸
            if data_size <= 10:
                width, height = 600, 400
            elif data_size <= 30:
                width, height = 800, 500
            elif data_size <= 100:
                width, height = 1000, 600
            else:
                width, height = 1200, 700
            
            # 根据图表类型调整
            if chart_type in ['heatmap', 'box', 'violin']:
                height = int(height * 1.2)  # 这些图表需要更多高度
            elif chart_type == 'pie':
                width, height = height, height  # 饼图适合正方形
            
            return width, height
            
        except Exception as e:
            logger.error(f"图表尺寸优化失败: {e}")
            return 800, 600  # 默认尺寸

    def generate_preview_chart(self, data: Dict[str, Any], chart_type: str, width: int = 400, height: int = 300) -> Dict[str, Any]:
        """
        生成预览图表（小尺寸，快速生成）
        
        Args:
            data: 数据字典
            chart_type: 图表类型
            width: 预览图宽度
            height: 预览图高度
            
        Returns:
            预览图表信息
        """
        try:
            # 调用通用图表生成方法，使用预览参数
            return self.generate_chart(
                data=data,
                chart_type=chart_type,
                title=f'{chart_type}预览',
                width=width,
                height=height,
                format='png'
            )
                
        except Exception as e:
            logger.error(f"预览图表生成失败 {chart_type}: {e}")
            return {
                'success': False,
                'message': f'预览图表生成失败: {str(e)}',
                'chart_type': chart_type
            }

    def generate_multiple_previews(self, data: Dict[str, Any], chart_types: List[str], width: int = 400, height: int = 300) -> List[Dict[str, Any]]:
        """
        批量生成预览图表
        
        Args:
            data: 数据字典
            chart_types: 图表类型列表
            width: 预览图宽度
            height: 预览图高度
            
        Returns:
            预览图表列表
        """
        previews = []
        
        for chart_type in chart_types:
            try:
                result = self.generate_preview_chart(data, chart_type, width, height)
                if result.get('success'):
                    previews.append({
                        'chart_type': chart_type,
                        'chart_name': self.get_chart_name(chart_type),
                        'preview_data': result.get('image_data', ''),
                        'width': width,
                        'height': height,
                        'format': 'png',
                        'description': self.get_chart_description(chart_type)
                    })
                else:
                    logger.warning(f"预览图表生成失败 {chart_type}: {result.get('message')}")
                    
            except Exception as e:
                logger.error(f"预览图表生成异常 {chart_type}: {e}")
                
        return previews

    def get_chart_name(self, chart_type: str) -> str:
        """获取图表类型的中文名称"""
        chart_names = {
            'bar': '柱状图',
            'line': '折线图', 
            'pie': '饼图',
            'scatter': '散点图',
            'area': '面积图',
            'heatmap': '热力图',
            'box': '箱线图',
            'violin': '小提琴图',
            'histogram': '直方图'
        }
        return chart_names.get(chart_type, chart_type)

    def get_chart_description(self, chart_type: str) -> str:
        """获取图表类型的描述"""
        descriptions = {
            'bar': '比较不同类别的数据',
            'line': '显示数据随时间变化的趋势',
            'pie': '显示各部分占总体的比例',
            'scatter': '显示两个变量之间的关系',
            'area': '显示数据随时间变化的累积效果',
            'heatmap': '显示数据的密度和分布',
            'box': '显示数据的分布和异常值',
            'violin': '显示数据的分布密度',
            'histogram': '显示数据的频率分布'
        }
        return descriptions.get(chart_type, '数据可视化图表')


# 创建全局图表生成器实例
chart_generator = ChartGenerator()