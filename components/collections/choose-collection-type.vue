<template>
    <div v-if="show">
        <tabs style="m-4" :id="'collections_tab'" v-on:tab-changed="updateCollectionsType">
            <tab
                :id="'my-collections'"
                :label="'My Collections'"
                :selected="true"
            >
            </tab>
            <tab
                :id="'team-collections'"
                :label="'Team Collections'"
                :selected="false"
            >
                <ul>
                    <li>
                        <label for="select_team"> Select Team: </label>
                        <span class="select-wrapper">
                        <v-popover>
                            <input
                            id="team"
                            class="team"
                            v-model="selectedTeam.name"
                            autofocus
                            />
                            <template slot="popover">
                            <div
                                v-for="(team, index) in myTeams"
                                :key="`method-${index}`"
                            >
                                <button
                                class="icon"
                                @click="
                                    collectionsType.selectedTeam = team;
                                    $emit('update-team-collections')
                                "
                                v-close-popover
                                >
                                {{ team.name }}
                                </button>
                            </div>
                            </template>
                        </v-popover>
                        </span>
                    </li>
                </ul>
            </tab>
        </tabs>

    </div>
</template>

<script>
import tabs from '../ui/tabs';
import gql from "graphql-tag"

var teamCollectionsTab = document.getElementById('team-collections')

export default {
    props: {
        collectionsType: Object,
        show: Boolean
    },
    apollo: {    
        myTeams: {
            query: gql`
                query GetMyTeams {
                    myTeams {
                        id
                        name
                        myRole
                    }
                }
            `,
            pollInterval: 10000,
        }
    },
    computed: {
        selectedTeam() {
            if(this.myTeams == null) return {name: 'Loading'}
            if(this.collectionsType.selectedTeam == null) {
                this.collectionsType.selectedTeam = this.myTeams[0]
                this.$emit('update-team-collections');
            }
            return this.collectionsType.selectedTeam
        },
    },
    methods: {
        updateCollectionsType(tabID) {
            this.collectionsType.type = tabID
            this.$emit('update-team-collections');

        }
    }
}
</script>