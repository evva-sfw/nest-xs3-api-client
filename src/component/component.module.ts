import { ComponentService } from './component.service';
import { Module } from '@nestjs/common';

@Module({
  providers: [ComponentService],
  exports: [ComponentService],
})
export class ComponentModule {}
