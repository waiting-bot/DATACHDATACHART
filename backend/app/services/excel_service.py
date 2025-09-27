"""
Excel文件解析服务
负责解析Excel文件并转换为图表可用格式
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional, Tuple, Union
import logging
from pathlib import Path
from datetime import datetime

logger = logging.getLogger(__name__)

def convert_numpy_types(obj):
    """
    递归转换numpy类型为Python原生类型，以便JSON序列化
    
    Args:
        obj: 包含numpy类型的对象
        
    Returns:
        转换后的对象
    """
    if isinstance(obj, dict):
        return {key: convert_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    elif isinstance(obj, tuple):
        return tuple(convert_numpy_types(item) for item in obj)
    elif hasattr(obj, 'item'):  # numpy标量
        return obj.item()
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif pd.isna(obj):
        return None
    else:
        return obj

class ExcelParser:
    """Excel解析器"""
    
    def __init__(self):
        """初始化Excel解析器"""
        self.supported_formats = ['.xlsx', '.xls', '.xlsm']
        self.max_rows = 10000  # 最大行数限制
        self.max_cols = 100    # 最大列数限制
    
    def parse_excel_file(self, file_path: str) -> Dict[str, Any]:
        """
        解析Excel文件并返回图表可用格式
        
        Args:
            file_path: Excel文件路径
            
        Returns:
            解析后的图表数据
        """
        try:
            if not Path(file_path).exists():
                raise FileNotFoundError(f"文件不存在: {file_path}")
            
            # 尝试读取Excel文件
            excel_file = pd.ExcelFile(file_path)
            sheet_names = excel_file.sheet_names
            
            if not sheet_names:
                raise ValueError("Excel文件中没有找到工作表")
            
            logger.info(f"读取Excel文件成功，工作表: {sheet_names}")
            
            # 解析第一个sheet作为主数据
            main_sheet = sheet_names[0]
            df = pd.read_excel(file_path, sheet_name=main_sheet)
            
            # 数据清洗和预处理
            df = df.dropna(how='all')  # 删除全空行
            df = df.dropna(how='all', axis=1)  # 删除全空列
            
            if df.empty:
                raise ValueError("Excel文件中没有有效数据")
            
            # 提取列名和数据
            columns = df.columns.tolist()
            data = df.values.tolist()
            
            # 尝试识别数据类型
            data_types = {}
            for col in columns:
                try:
                    # 尝试转换为数值
                    pd.to_numeric(df[col], errors='raise')
                    data_types[col] = 'numeric'
                except:
                    data_types[col] = 'string'
            
            # 构建图表可用数据结构
            chart_data = {
                'labels': columns,
                'datasets': [],
                'raw_data': {
                    'columns': columns,
                    'data': data,
                    'data_types': data_types,
                    'shape': df.shape
                }
            }
            
            # 为每列创建数据集
            for i, col in enumerate(columns):
                if data_types[col] == 'numeric':
                    chart_data['datasets'].append({
                        'label': col,
                        'data': df[col].dropna().tolist(),
                        'type': 'numeric'
                    })
            
            # 添加元数据
            result = {
                'success': True,
                'message': 'Excel文件解析成功',
                'file_info': {
                    'file_path': file_path,
                    'sheet_names': sheet_names,
                    'main_sheet': main_sheet,
                    'total_rows': len(df),
                    'total_columns': len(columns)
                },
                'data_validation': {
                    'has_data': not df.empty,
                    'has_numeric_data': any(dt == 'numeric' for dt in data_types.values()),
                    'has_categorical_data': any(dt == 'string' for dt in data_types.values())
                },
                'chart_data': chart_data,
                'data_types': data_types,
                'suggested_charts': self._suggest_chart_types(data_types),
                'summary': {
                    'total_rows': len(df),
                    'total_columns': len(columns),
                    'numeric_columns': sum(1 for dt in data_types.values() if dt == 'numeric'),
                    'categorical_columns': sum(1 for dt in data_types.values() if dt == 'string')
                }
            }
            
            logger.info(f"Excel文件解析完成: {result['summary']}")
            return convert_numpy_types(result)
            
        except Exception as e:
            logger.error(f"Excel文件解析失败: {e}")
            raise
    
    def _suggest_chart_types(self, data_types: Dict[str, str]) -> List[str]:
        """
        根据数据类型推荐图表类型
        
        Args:
            data_types: 数据类型字典
            
        Returns:
            推荐的图表类型列表
        """
        numeric_cols = sum(1 for dt in data_types.values() if dt == 'numeric')
        categorical_cols = sum(1 for dt in data_types.values() if dt == 'string')
        
        suggestions = []
        
        if numeric_cols >= 1:
            suggestions.extend(['bar', 'line'])
        
        if numeric_cols >= 2:
            suggestions.extend(['scatter', 'area'])
        
        if categorical_cols >= 1 and numeric_cols >= 1:
            suggestions.append('pie')
        
        if numeric_cols >= 1:
            suggestions.extend(['box', 'histogram'])
        
        if numeric_cols >= 2:
            suggestions.append('heatmap')
        
        return list(set(suggestions))  # 去重

    def read_excel_file(self, file_path: str) -> Dict[str, Any]:
        """
        读取Excel文件
        
        Args:
            file_path: Excel文件路径
            
        Returns:
            解析结果
        """
        try:
            if not Path(file_path).exists():
                return {"success": False, "message": "文件不存在"}
            
            # 尝试读取Excel文件
            # 读取所有sheet
            excel_file = pd.ExcelFile(file_path)
            sheet_names = excel_file.sheet_names
            
            if not sheet_names:
                return {"success": False, "message": "Excel文件中没有找到工作表"}
            
            logger.info(f"读取Excel文件成功，工作表: {sheet_names}")
            
            # 解析第一个sheet作为主数据
            main_sheet = sheet_names[0]
            df = pd.read_excel(file_path, sheet_name=main_sheet)
            
            return {
                "success": True,
                "message": "Excel文件读取成功",
                "sheet_names": sheet_names,
                "main_sheet": main_sheet,
                "data": df,
                "file_path": file_path
            }
            
        except Exception as e:
            logger.error(f"读取Excel文件失败: {e}")
            return {"success": False, "message": f"读取Excel文件失败: {str(e)}"}
    
    def validate_data_structure(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        验证数据结构
        
        Args:
            df: pandas DataFrame
            
        Returns:
            验证结果
        """
        try:
            if df.empty:
                return {"success": False, "message": "数据为空"}
            
            # 检查行列数
            rows, cols = df.shape
            
            if rows > self.max_rows:
                return {"success": False, "message": f"数据行数过多，最大支持 {self.max_rows} 行"}
            
            if cols > self.max_cols:
                return {"success": False, "message": f"数据列数过多，最大支持 {self.max_cols} 列"}
            
            # 检查数据类型
            column_info = []
            numeric_cols = 0
            text_cols = 0
            date_cols = 0
            
            for col in df.columns:
                col_data = df[col]
                col_type = str(col_data.dtype)
                
                # 检查是否为数值类型
                if pd.api.types.is_numeric_dtype(col_data):
                    numeric_cols += 1
                    data_type = "numeric"
                # 检查是否为日期类型
                elif pd.api.types.is_datetime64_any_dtype(col_data):
                    date_cols += 1
                    data_type = "date"
                # 检查是否为文本类型
                else:
                    text_cols += 1
                    data_type = "text"
                
                # 计算非空值数量
                non_null_count = col_data.count()
                null_count = col_data.isnull().sum()
                
                column_info.append({
                    "name": str(col),
                    "type": data_type,
                    "dtype": col_type,
                    "non_null_count": non_null_count,
                    "null_count": null_count,
                    "null_percentage": (null_count / len(col_data)) * 100 if len(col_data) > 0 else 0
                })
            
            return {
                "success": True,
                "message": "数据结构验证通过",
                "rows": rows,
                "cols": cols,
                "column_info": column_info,
                "numeric_cols": numeric_cols,
                "text_cols": text_cols,
                "date_cols": date_cols
            }
            
        except Exception as e:
            logger.error(f"数据结构验证失败: {e}")
            return {"success": False, "message": f"数据结构验证失败: {str(e)}"}
    
    def preprocess_data(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        数据预处理
        
        Args:
            df: 原始数据
            
        Returns:
            (处理后的DataFrame, 处理信息)
        """
        try:
            processing_info = {
                "original_shape": df.shape,
                "operations": []
            }
            
            # 复制数据，避免修改原数据
            processed_df = df.copy()
            
            # 1. 删除完全为空的行和列
            original_shape = processed_df.shape
            processed_df = processed_df.dropna(how='all')
            processed_df = processed_df.dropna(axis=1, how='all')
            
            if processed_df.shape != original_shape:
                processing_info["operations"].append({
                    "operation": "remove_empty_rows_cols",
                    "original_shape": original_shape,
                    "new_shape": processed_df.shape
                })
            
            # 2. 处理列名
            original_columns = processed_df.columns.tolist()
            
            # 清理列名：去除前后空格，替换特殊字符
            cleaned_columns = []
            for col in processed_df.columns:
                cleaned_col = str(col).strip()
                # 替换特殊字符为下划线
                cleaned_col = ''.join(c if c.isalnum() or c in ('_', '-') else '_' for c in cleaned_col)
                cleaned_columns.append(cleaned_col)
            
            processed_df.columns = cleaned_columns
            
            if original_columns != cleaned_columns:
                processing_info["operations"].append({
                    "operation": "clean_column_names",
                    "original_columns": original_columns,
                    "cleaned_columns": cleaned_columns
                })
            
            # 3. 处理缺失值
            missing_before = processed_df.isnull().sum().sum()
            
            # 对于数值列，用中位数填充
            numeric_cols = processed_df.select_dtypes(include=[np.number]).columns
            if len(numeric_cols) > 0:
                for col in numeric_cols:
                    if processed_df[col].isnull().sum() > 0:
                        median_value = processed_df[col].median()
                        processed_df[col] = processed_df[col].fillna(median_value)
                        processing_info["operations"].append({
                            "operation": "fill_numeric_missing",
                            "column": col,
                            "method": "median",
                            "value": float(median_value)
                        })
            
            # 对于文本列，用众数填充
            text_cols = processed_df.select_dtypes(include=['object']).columns
            if len(text_cols) > 0:
                for col in text_cols:
                    if processed_df[col].isnull().sum() > 0:
                        mode_value = processed_df[col].mode()
                        if len(mode_value) > 0:
                            processed_df[col] = processed_df[col].fillna(mode_value.iloc[0])
                            processing_info["operations"].append({
                                "operation": "fill_text_missing",
                                "column": col,
                                "method": "mode",
                                "value": str(mode_value.iloc[0])
                            })
            
            missing_after = processed_df.isnull().sum().sum()
            
            if missing_before != missing_after:
                processing_info["operations"].append({
                    "operation": "handle_missing_values",
                    "missing_before": missing_before,
                    "missing_after": missing_after
                })
            
            # 4. 数据类型转换
            # 尝试将看起来像数字的文本列转换为数字
            for col in processed_df.columns:
                if processed_df[col].dtype == 'object':
                    # 尝试转换为数字
                    try:
                        numeric_series = pd.to_numeric(processed_df[col], errors='coerce')
                        # 如果大部分值可以转换，则进行转换
                        if numeric_series.notna().sum() / len(numeric_series) > 0.8:
                            processed_df[col] = numeric_series
                            processing_info["operations"].append({
                                "operation": "convert_to_numeric",
                                "column": col,
                                "conversion_rate": numeric_series.notna().sum() / len(numeric_series)
                            })
                    except:
                        pass
            
            processing_info["final_shape"] = processed_df.shape
            
            logger.info(f"数据预处理完成，形状: {df.shape} -> {processed_df.shape}")
            
            return processed_df, processing_info
            
        except Exception as e:
            logger.error(f"数据预处理失败: {e}")
            return df, {"error": str(e)}
    
    def detect_data_types(self, df: pd.DataFrame) -> Dict[str, str]:
        """
        检测每列的数据类型
        
        Args:
            df: DataFrame
            
        Returns:
            列名到数据类型的映射
        """
        try:
            data_types = {}
            
            for col in df.columns:
                col_data = df[col]
                
                # 检查是否为数值类型
                if pd.api.types.is_numeric_dtype(col_data):
                    # 检查是否为整数
                    if col_data.dtype == 'int64':
                        data_types[col] = 'integer'
                    else:
                        data_types[col] = 'float'
                # 检查是否为日期类型
                elif pd.api.types.is_datetime64_any_dtype(col_data):
                    data_types[col] = 'datetime'
                # 检查是否为文本类型
                else:
                    # 检查是否为分类数据（唯一值较少）
                    unique_ratio = col_data.nunique() / len(col_data)
                    if unique_ratio < 0.1:  # 唯一值占比小于10%
                        data_types[col] = 'categorical'
                    else:
                        data_types[col] = 'text'
            
            return data_types
            
        except Exception as e:
            logger.error(f"检测数据类型失败: {e}")
            return {}
    
    def suggest_chart_types(self, df: pd.DataFrame) -> List[str]:
        """
        根据数据特征推荐图表类型
        
        Args:
            df: DataFrame
            
        Returns:
            推荐的图表类型列表
        """
        try:
            suggestions = []
            
            # 获取列信息
            numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
            text_cols = df.select_dtypes(include=['object']).columns.tolist()
            date_cols = df.select_dtypes(include=['datetime64']).columns.tolist()
            
            # 根据数据特征推荐图表类型
            if len(numeric_cols) >= 1 and len(text_cols) >= 1:
                # 有数值列和文本列，适合条形图、柱状图
                suggestions.extend(['bar', 'column'])
            
            if len(numeric_cols) >= 2:
                # 有多个数值列，适合散点图、折线图
                suggestions.extend(['scatter', 'line'])
            
            if len(numeric_cols) == 1 and len(text_cols) >= 1:
                # 单个数值列和多个文本列，适合饼图
                if len(text_cols) <= 10:  # 饼图适合分类较少的情况
                    suggestions.append('pie')
            
            if len(date_cols) >= 1 and len(numeric_cols) >= 1:
                # 有日期列和数值列，适合时间序列图
                suggestions.extend(['line', 'area'])
            
            if len(numeric_cols) >= 3:
                # 多个数值列，适合热力图
                suggestions.append('heatmap')
            
            # 去重并排序
            suggestions = list(set(suggestions))
            
            # 默认推荐
            if not suggestions:
                suggestions = ['bar', 'line']
            
            return suggestions
            
        except Exception as e:
            logger.error(f"推荐图表类型失败: {e}")
            return ['bar', 'line']
    
    def convert_to_chart_format(self, df: pd.DataFrame, chart_type: str) -> Dict[str, Any]:
        """
        将数据转换为图表可用格式
        
        Args:
            df: DataFrame
            chart_type: 图表类型
            
        Returns:
            图表数据格式
        """
        try:
            chart_data = {
                "chart_type": chart_type,
                "data": [],
                "columns": df.columns.tolist(),
                "shape": df.shape,
                "data_types": self.detect_data_types(df)
            }
            
            if chart_type in ['bar', 'column']:
                # 柱状图/条形图格式
                numeric_cols = df.select_dtypes(include=[np.number]).columns
                text_cols = df.select_dtypes(include=['object']).columns
                
                if len(numeric_cols) > 0 and len(text_cols) > 0:
                    # 使用第一个文本列作为标签，第一个数值列作为值
                    label_col = text_cols[0]
                    value_col = numeric_cols[0]
                    
                    chart_data["data"] = [
                        {
                            "label": str(row[label_col]),
                            "value": float(row[value_col])
                        }
                        for _, row in df.iterrows()
                    ]
                    chart_data["x_axis"] = label_col
                    chart_data["y_axis"] = value_col
            
            elif chart_type == 'pie':
                # 饼图格式
                numeric_cols = df.select_dtypes(include=[np.number]).columns
                text_cols = df.select_dtypes(include=['object']).columns
                
                if len(numeric_cols) > 0 and len(text_cols) > 0:
                    label_col = text_cols[0]
                    value_col = numeric_cols[0]
                    
                    chart_data["data"] = [
                        {
                            "name": str(row[label_col]),
                            "value": float(row[value_col])
                        }
                        for _, row in df.iterrows()
                    ]
            
            elif chart_type in ['line', 'area']:
                # 折线图/面积图格式
                numeric_cols = df.select_dtypes(include=[np.number]).columns
                date_cols = df.select_dtypes(include=['datetime64']).columns
                
                if len(date_cols) > 0 and len(numeric_cols) > 0:
                    # 时间序列数据
                    x_col = date_cols[0]
                    y_cols = numeric_cols[:5]  # 最多5条线
                    
                    chart_data["data"] = []
                    for y_col in y_cols:
                        series_data = [
                            {
                                "x": row[x_col].isoformat() if pd.notna(row[x_col]) else None,
                                "y": float(row[y_col]) if pd.notna(row[y_col]) else None
                            }
                            for _, row in df.iterrows()
                        ]
                        chart_data["data"].append({
                            "name": str(y_col),
                            "data": series_data
                        })
                    
                    chart_data["x_axis"] = x_col
                    chart_data["y_axis"] = y_cols.tolist()
            
            elif chart_type == 'scatter':
                # 散点图格式
                numeric_cols = df.select_dtypes(include=[np.number]).columns
                
                if len(numeric_cols) >= 2:
                    x_col = numeric_cols[0]
                    y_col = numeric_cols[1]
                    
                    chart_data["data"] = [
                        {
                            "x": float(row[x_col]),
                            "y": float(row[y_col])
                        }
                        for _, row in df.iterrows()
                    ]
                    chart_data["x_axis"] = x_col
                    chart_data["y_axis"] = y_col
            
            else:
                # 默认格式：直接转换数据
                chart_data["data"] = df.to_dict('records')
            
            # 转换numpy类型为Python原生类型以便JSON序列化
            chart_data = convert_numpy_types(chart_data)
            
            return chart_data
            
        except Exception as e:
            logger.error(f"转换图表格式失败: {e}")
            return {"error": str(e)}
    
    def full_parse(self, file_path: str, chart_type: str = 'bar') -> Dict[str, Any]:
        """
        完整的Excel文件解析流程
        
        Args:
            file_path: Excel文件路径
            chart_type: 目标图表类型
            
        Returns:
            完整解析结果
        """
        try:
            # 1. 读取文件
            read_result = self.read_excel_file(file_path)
            if not read_result["success"]:
                return read_result
            
            df = read_result["data"]
            
            # 2. 验证数据结构
            validation_result = self.validate_data_structure(df)
            if not validation_result["success"]:
                return validation_result
            
            # 3. 数据预处理
            processed_df, processing_info = self.preprocess_data(df)
            
            # 4. 检测数据类型
            data_types = self.detect_data_types(processed_df)
            
            # 5. 推荐图表类型
            suggested_charts = self.suggest_chart_types(processed_df)
            
            # 6. 转换为图表格式
            chart_data = self.convert_to_chart_format(processed_df, chart_type)
            
            # 组合结果
            result = {
                "success": True,
                "message": "Excel文件解析成功",
                "file_info": {
                    "path": file_path,
                    "sheet_names": read_result["sheet_names"],
                    "main_sheet": read_result["main_sheet"]
                },
                "data_validation": validation_result,
                "processing_info": processing_info,
                "data_types": data_types,
                "suggested_charts": suggested_charts,
                "chart_data": chart_data,
                "summary": {
                    "original_shape": df.shape,
                    "processed_shape": processed_df.shape,
                    "numeric_columns": len(processed_df.select_dtypes(include=[np.number]).columns),
                    "text_columns": len(processed_df.select_dtypes(include=['object']).columns),
                    "date_columns": len(processed_df.select_dtypes(include=['datetime64']).columns)
                }
            }
            
            logger.info(f"Excel文件解析完成，形状: {df.shape} -> {processed_df.shape}")
            
            # 转换numpy类型为Python原生类型以便JSON序列化
            result = convert_numpy_types(result)
            
            return result
            
        except Exception as e:
            logger.error(f"Excel文件完整解析失败: {e}")
            return {"success": False, "message": f"解析失败: {str(e)}"}


# 创建全局Excel解析器实例
excel_parser = ExcelParser()