
import {  ColumnType } from "../types/model_type";


interface BaseDataTypeMapper {
    mapDataType(column_definition: ColumnType): string;
}

export default BaseDataTypeMapper;