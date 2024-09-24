use std::sync::Arc;

use crate::model::AppState;
use crate::route;

pub async fn run_server(state: Arc<AppState>) {
    warp::serve(route::route(state))
        .run(([127, 0, 0, 1], 9119))
        .await;
}
