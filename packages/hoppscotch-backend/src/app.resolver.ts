import { Query, Resolver } from '@nestjs/graphql';
import { AppService } from './app.service';

@Resolver((of) => String)
export class AppResolver {
  constructor(private appService: AppService) {}

  @Query((returns) => String)
  async author() {
    return this.appService.getHello();
  }
}
